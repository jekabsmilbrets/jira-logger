<?php

declare(strict_types=1);

namespace App\Service\Task\ReportedTask;

use App\Dto\Task\TaskListFilterRequest;
use App\Entity\JiraWorkLog\JiraWorkLog;
use App\Entity\Tag\Tag;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Repository\Task\TaskRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Utility\TimeLog\TimeLogRange;
use Ramsey\Uuid\Uuid;

final class ReportedTaskQuery
{
    public function __construct(
        private readonly TaskRepository $taskRepository,
        private readonly TaskFilterDateRangeResolver $dateRangeResolver,
    ) {
    }

    /**
     * @return ReportedTaskView[]
     *
     * @throws \Exception
     */
    public function list(TaskListFilterRequest $filter): array
    {
        $criteria = $this->criteria($filter);
        $tasks = $criteria->hasQueryFilters()
            ? $this->taskRepository->findByFilters($criteria)
            : $this->taskRepository->findAll();

        $tasks = array_map(
            fn (Task $task): ReportedTaskView => $this->view($task, $criteria->dateRange),
            $tasks,
        );

        if ($criteria->hideUnreported) {
            $tasks = array_filter(
                $tasks,
                static fn (ReportedTaskView $task): bool => [] !== $task->timeLogs,
            );
        }

        return array_values($tasks);
    }

    private function criteria(TaskListFilterRequest $filter): ReportedTaskCriteria
    {
        $tags = $filter->getTags();
        $name = $filter->getName();

        return new ReportedTaskCriteria(
            tagIds: null !== $tags ? array_values(array_filter(
                array_map(trim(...), explode(',', $tags)),
                Uuid::isValid(...),
            )) : [],
            name: null !== $name && '' !== ($name = trim($name)) ? $name : null,
            dateRange: $this->dateRangeResolver->resolve(
                date: $filter->getDate(),
                startDate: $filter->getStartDate(),
                endDate: $filter->getEndDate(),
            ),
            hideUnreported: $filter->getHideUnreported() ?? false,
        );
    }

    /**
     * @param array{startDate: \DateTimeImmutable, endDate: \DateTimeImmutable}|null $dateRange
     */
    private function view(Task $task, ?array $dateRange): ReportedTaskView
    {
        $timeLogs = [];

        foreach ($task->getTimeLogs() as $timeLog) {
            if (
                null !== $dateRange
                && !TimeLogRange::overlaps(
                    $dateRange['startDate'],
                    $dateRange['endDate'],
                    $timeLog->getStartTime(),
                    $timeLog->getEndTime(),
                )
            ) {
                continue;
            }

            $timeLogs[] = $this->timeLogView($timeLog, $dateRange);
        }

        return new ReportedTaskView(
            id: $task->getId(),
            createdAt: $this->immutable($task->getCreatedAt()),
            updatedAt: $this->immutable($task->getUpdatedAt()),
            name: $task->getName(),
            description: $task->getDescription(),
            timeLogs: $timeLogs,
            tags: array_map(
                fn (Tag $tag): array => $this->tagView($tag),
                $task->getTags()->toArray(),
            ),
            lastTimeLog: $this->lastTimeLog($timeLogs),
            jiraWorkLogs: array_map(
                fn (JiraWorkLog $workLog): array => $this->jiraWorkLogView($workLog),
                $task->getJiraWorkLogs()->toArray(),
            ),
        );
    }

    /**
     * @param array{startDate: \DateTimeImmutable, endDate: \DateTimeImmutable}|null $dateRange
     *
     * @return array<string, mixed>
     */
    private function timeLogView(TimeLog $timeLog, ?array $dateRange): array
    {
        $startTime = $this->immutable($timeLog->getStartTime());
        $endTime = $this->immutable($timeLog->getEndTime());
        $originalStartTime = $this->immutable($timeLog->getOriginalStartTime());
        $originalEndTime = $this->immutable($timeLog->getOriginalEndTime());
        $manuallyModified = $timeLog->isManuallyModified();

        if (null !== $dateRange && null !== $startTime && $startTime < $dateRange['startDate']) {
            $originalStartTime = $startTime;
            $startTime = $dateRange['startDate'];
            $manuallyModified = true;
        }

        if (null !== $dateRange && null !== $endTime && $endTime > $dateRange['endDate']) {
            $originalEndTime = $endTime;
            $endTime = $dateRange['endDate'];
            $manuallyModified = true;
        }

        return [
            'startTime' => $startTime,
            'endTime' => $endTime,
            'description' => $timeLog->getDescription(),
            'manuallyModified' => $manuallyModified,
            'originalStartTime' => $originalStartTime,
            'originalEndTime' => $originalEndTime,
            'id' => $timeLog->getId(),
            'createdAt' => $this->immutable($timeLog->getCreatedAt()),
            'updatedAt' => $this->immutable($timeLog->getUpdatedAt()),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function tagView(Tag $tag): array
    {
        return [
            'name' => $tag->getName(),
            'id' => $tag->getId(),
            'createdAt' => $this->immutable($tag->getCreatedAt()),
            'updatedAt' => $this->immutable($tag->getUpdatedAt()),
            'isUsed' => $tag->getIsUsed(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function jiraWorkLogView(JiraWorkLog $workLog): array
    {
        return [
            'workLogId' => $workLog->getWorkLogId(),
            'description' => $workLog->getDescription(),
            'timeSpentSeconds' => $workLog->getTimeSpentSeconds(),
            'startTime' => $this->immutable($workLog->getStartTime()),
            'id' => $workLog->getId(),
            'createdAt' => $this->immutable($workLog->getCreatedAt()),
            'updatedAt' => $this->immutable($workLog->getUpdatedAt()),
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $timeLogs
     *
     * @return array<string, mixed>|null
     */
    private function lastTimeLog(array $timeLogs): ?array
    {
        $sorted = array_values($timeLogs);

        usort(
            $sorted,
            static function (array $left, array $right): int {
                $startTimeComparison = $right['startTime'] <=> $left['startTime'];

                if (0 !== $startTimeComparison) {
                    return $startTimeComparison;
                }

                return $right['createdAt'] <=> $left['createdAt'];
            },
        );

        foreach ($sorted as $timeLog) {
            if (null === $timeLog['endTime']) {
                return $timeLog;
            }
        }

        return $sorted[0] ?? null;
    }

    private function immutable(?\DateTimeInterface $dateTime): ?\DateTimeImmutable
    {
        return null !== $dateTime ? \DateTimeImmutable::createFromInterface($dateTime) : null;
    }
}
