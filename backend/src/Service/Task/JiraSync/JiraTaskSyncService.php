<?php

declare(strict_types=1);

namespace App\Service\Task\JiraSync;

use App\Entity\JiraWorkLog\JiraWorkLog;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Exception\JiraApiServiceException;
use App\Repository\JiraWorkLog\JiraWorkLogRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\JiraApi\JiraApiService;
use App\Utility\TimeLog\TimeLogDuration;
use App\Utility\TimeLog\TimeLogRange;
use Doctrine\Common\Collections\Collection;
use JiraRestApi\Issue\Worklog;

class JiraTaskSyncService implements TaskJiraSyncAdapter
{
    public function __construct(
        private readonly JiraApiService $jiraApiService,
        private readonly JiraWorkLogRepository $jiraWorkLogRepository,
        private readonly TaskFilterDateRangeResolver $taskFilterDateRangeResolver,
    ) {
    }

    /**
     * @throws TaskJiraSyncException
     */
    final public function syncTask(Task $task, string $date): bool
    {
        try {
            $this->jiraApiService->init();

            return $this->sync($task, $date);
        } catch (JiraApiServiceException $e) {
            throw new TaskJiraSyncException(message: $e->getMessage(), code: $e->getCode(), previous: $e);
        }
    }

    /**
     * @throws JiraApiServiceException
     */
    final public function sync(Task $task, string $date): bool
    {
        [$syncDate, $startDate, $endDate, $jiraStartDateTime] = $this->resolveSyncDates($date);

        $jiraWorkLog = $this->jiraWorkLogRepository->findOneBy(
            [
                'task' => $task,
                'startTime' => $syncDate,
            ]
        );

        if (!$jiraWorkLog instanceof JiraWorkLog) {
            $jiraWorkLog = new JiraWorkLog();
            $jiraWorkLog->setTask($task);
        }

        [$timeSpentSeconds, $descriptions] = $this->calculateTimeSpentInSecondsCollectDescriptionsInTimeLogsCollection(
            timeLogs: $task->getTimeLogs(),
            startDate: $startDate,
            endDate: $endDate
        );
        $workLogId = $jiraWorkLog->getWorkLogId();

        if (str_contains($taskName = $task->getName(), '-#-')) {
            $descriptions = [trim(explode('-#-', $taskName)[1])];
        }

        $jiraApiWorkLog = $this->createUpdateRecreateWorkLogWithTimeSpent(
            jiraWorkLog: $jiraWorkLog,
            task: $task,
            startDate: $jiraStartDateTime,
            timeSpentSeconds: $timeSpentSeconds,
            descriptions: $descriptions,
        );

        $jiraWorkLog->setTimeSpentSeconds($timeSpentSeconds);
        $jiraWorkLog->setStartTime($syncDate);
        $jiraWorkLog->setWorkLogId((string) $jiraApiWorkLog->id);

        $this->createUpdateJiraWorkLog(
            jiraWorkLog: $jiraWorkLog,
            workLogId: $workLogId
        );

        return true;
    }

    /**
     * @return array{\DateTime, \DateTimeInterface, \DateTimeInterface, \DateTime}
     */
    private function resolveSyncDates(string $date): array
    {
        $dateRange = $this->taskFilterDateRangeResolver->resolve(['date' => $date]);
        if (null === $dateRange) {
            throw new \InvalidArgumentException('Sync date could not be resolved.');
        }

        $syncDate = (new \DateTime($date))->setTime(0, 0, 0);
        $startDate = $dateRange['startDate'];
        $endDate = $dateRange['endDate'];
        $jiraStartDateTime = (clone $syncDate)->setTime(17, 0, 0);

        return [$syncDate, $startDate, $endDate, $jiraStartDateTime];
    }

    /**
     * @param string[] $descriptions
     *
     * @throws JiraApiServiceException
     */
    private function createUpdateRecreateWorkLogWithTimeSpent(
        JiraWorkLog $jiraWorkLog,
        Task $task,
        \DateTime $startDate,
        int $timeSpentSeconds,
        array $descriptions,
    ): Worklog {
        $descriptionsConcatenated = implode(', ', $descriptions);

        if (!empty($workLogId = $jiraWorkLog->getWorkLogId())) {
            try {
                $workLog = $this->jiraApiService->updateWorkLogWithTimeSpent(
                    task: $task,
                    workLogId: (int) $workLogId,
                    startTime: $startDate,
                    timeSpentSeconds: $timeSpentSeconds,
                    description: $descriptionsConcatenated,
                );
            } catch (JiraApiServiceException) {
                $workLog = $this->jiraApiService->createWorkLogWithTimeSpent(
                    task: $task,
                    startTime: $startDate,
                    timeSpentSeconds: $timeSpentSeconds,
                    description: $descriptionsConcatenated,
                );

                $jiraWorkLog->setWorkLogId((string) $workLog->id);
            }
        } else {
            $workLog = $this->jiraApiService->createWorkLogWithTimeSpent(
                task: $task,
                startTime: $startDate,
                timeSpentSeconds: $timeSpentSeconds,
                description: $descriptionsConcatenated,
            );
        }

        return $workLog;
    }

    private function createUpdateJiraWorkLog(
        JiraWorkLog $jiraWorkLog,
        ?string $workLogId,
    ): void {
        if (!$workLogId) {
            $this->jiraWorkLogRepository->save(
                entity: $jiraWorkLog,
                flush: true,
            );
        } else {
            $this->jiraWorkLogRepository->flush();
        }
    }

    /**
     * @param Collection<int, TimeLog> $timeLogs
     *
     * @return array{int, string[]}
     */
    private function calculateTimeSpentInSecondsCollectDescriptionsInTimeLogsCollection(
        Collection $timeLogs,
        \DateTimeInterface $startDate,
        \DateTimeInterface $endDate,
    ): array {
        return $this->collectTimeSpentSecondsNDescriptions(
            $this->filterTimeLogsInDateRange(
                $timeLogs,
                $startDate,
                $endDate
            ),
            $startDate,
            $endDate
        );
    }

    /**
     * @param Collection<int, TimeLog> $timeLogs
     *
     * @return Collection<int, TimeLog>
     */
    private function filterTimeLogsInDateRange(
        Collection $timeLogs,
        \DateTimeInterface $startDate,
        \DateTimeInterface $endDate,
    ): Collection {
        return $timeLogs->filter(
            function (TimeLog $timeLog) use ($startDate, $endDate) {
                $startTime = $timeLog->getStartTime();
                $endTime = $timeLog->getEndTime();

                return TimeLogRange::overlaps($startDate, $endDate, $startTime, $endTime);
            }
        );
    }

    /**
     * @param Collection<int, TimeLog> $timeLogs
     *
     * @return array{int, string[]}
     */
    private function collectTimeSpentSecondsNDescriptions(
        Collection $timeLogs,
        \DateTimeInterface $startDate,
        \DateTimeInterface $endDate,
    ): array {
        $timeSpentSeconds = 0;
        $descriptions = [];

        /** @var TimeLog $timeLog */
        foreach ($timeLogs->toArray() as $timeLog) {
            $startTime = $timeLog->getStartTime();
            $endTime = $timeLog->getEndTime();

            if ($startTime) {
                $timeSpentSeconds += TimeLogDuration::clippedSecondsInRange(
                    rangeStart: $startDate,
                    rangeEnd: $endDate,
                    logStart: $startTime,
                    logEnd: $endTime,
                );

                if (!empty($description = $timeLog->getDescription())) {
                    $descriptions[] = $description;
                }
            }
        }

        return [
            $timeSpentSeconds,
            $descriptions,
        ];
    }
}
