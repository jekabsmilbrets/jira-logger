<?php

declare(strict_types=1);

namespace App\Service\Task;

use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Repository\Task\TaskRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\Tag\TagService;
use App\Service\Task\Filter\TaskFilterCriteria;
use App\Service\Task\Write\TaskWriteResult;
use App\Utility\TimeLog\TimeLogRange;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Ramsey\Uuid\Uuid;

class TaskService
{
    public function __construct(
        private readonly TaskRepository $taskRepository,
        private readonly TaskFilterDateRangeResolver $taskFilterDateRangeResolver,
        private readonly TagService $tagService,
    ) {
    }

    /**
     * @param array<string, mixed>|null $filter
     *
     * @return Task[]
     *
     * @throws \Exception
     */
    final public function list(?array $filter): array
    {
        $criteria = $this->filterCriteria($filter);

        if ($criteria->hasQueryFilters()) {
            $tasks = $this->taskRepository->findByFilters($criteria);
        } else {
            $tasks = $this->taskRepository->findAll();
        }

        if (null !== $criteria->dateRange) {
            $tasks = array_map(
                fn (Task $task): Task => $this->projectTimeLogsInRange($task, $criteria->dateRange),
                $tasks,
            );
        }

        if ($criteria->hideUnreported) {
            $tasks = array_filter(
                $tasks,
                static fn (Task $task): bool => $task->getTimeLogs()->count() > 0,
            );
        }

        return array_values($tasks);
    }

    final public function show(
        string $id
    ): ?Task {
        $task = $this->taskRepository->find($id);

        return $task ?? null;
    }

    /**
     * @param string[]|null $tagIds
     */
    final public function create(?string $name, ?string $description, ?array $tagIds): TaskWriteResult
    {
        $task = $this->applyInput($name, $description, $tagIds);

        try {
            $this->taskRepository->save(
                task: $task,
                flush: true
            );
        } catch (UniqueConstraintViolationException) {
            return TaskWriteResult::duplicate();
        } catch (\Exception) {
            return TaskWriteResult::failed();
        }

        return TaskWriteResult::created($task);
    }

    /**
     * @param string[]|null $tagIds
     */
    final public function update(
        string $id,
        ?string $name,
        ?string $description,
        ?array $tagIds,
    ): TaskWriteResult {
        $task = $this->taskRepository->find($id);

        if (!$task instanceof Task) {
            return TaskWriteResult::notFound();
        }

        $task = $this->applyInput($name, $description, $tagIds, $task);

        try {
            $this->taskRepository->flush();
        } catch (\Exception) {
            return TaskWriteResult::failed();
        }

        return TaskWriteResult::updated($task);
    }

    final public function remove(string $id): TaskWriteResult
    {
        $task = $this->taskRepository->find($id);

        if (!$task instanceof Task) {
            return TaskWriteResult::notFound();
        }

        try {
            $this->taskRepository->remove(
                task: $task,
                flush: true
            );
        } catch (\Exception) {
            return TaskWriteResult::failed();
        }

        return TaskWriteResult::deleted();
    }

    final public function findByName(string $name): bool
    {
        $task = $this->taskRepository->findOneBy(
            [
                'name' => $name,
            ]
        );

        if (!$task instanceof Task) {
            return false;
        }

        return true;
    }

    /**
     * @param array<string, mixed>|null $filter
     *
     * @throws \Exception
     */
    private function filterCriteria(?array $filter): TaskFilterCriteria
    {
        if (empty($filter)) {
            return new TaskFilterCriteria();
        }

        $tags = $filter['tags'] ?? null;
        $name = $filter['name'] ?? null;

        return new TaskFilterCriteria(
            tagIds: \is_string($tags) ? array_values(array_filter(
                array_map(trim(...), explode(',', $tags)),
                Uuid::isValid(...),
            )) : [],
            name: \is_string($name) && '' !== ($name = trim($name)) ? $name : null,
            dateRange: $this->taskFilterDateRangeResolver->resolveTaskFilter($filter),
            hideUnreported: filter_var($filter['hideUnreported'] ?? null, \FILTER_VALIDATE_BOOLEAN),
        );
    }

    /**
     * @param array{startDate: \DateTimeImmutable, endDate: \DateTimeImmutable} $dateRange
     */
    private function projectTimeLogsInRange(Task $task, array $dateRange): Task
    {
        $startDate = $dateRange['startDate'];
        $endDate = $dateRange['endDate'];
        $timeLogs = $task->getTimeLogs()
            ->filter(
                static fn (TimeLog $timeLog): bool => TimeLogRange::overlaps(
                    $startDate,
                    $endDate,
                    $timeLog->getStartTime(),
                    $timeLog->getEndTime(),
                ),
            )
            ->map(
                static function (TimeLog $timeLog) use ($startDate, $endDate): TimeLog {
                    $startTime = $timeLog->getStartTime();
                    $endTime = $timeLog->getEndTime();

                    if ($startTime < $startDate) {
                        $timeLog->setOriginalStartTime($startTime);
                        $timeLog->setStartTime($startDate);
                        $timeLog->setManuallyModified(true);
                    }

                    if ($endTime > $endDate) {
                        $timeLog->setOriginalEndTime($endTime);
                        $timeLog->setEndTime($endDate);
                        $timeLog->setManuallyModified(true);
                    }

                    return $timeLog;
                },
            );

        $task->setTimeLogs(new ArrayCollection([...$timeLogs->toArray()]));

        return $task;
    }

    /**
     * @param string[]|null $tagIds
     */
    private function applyInput(
        ?string $name,
        ?string $description,
        ?array $tagIds,
        ?Task $task = null,
    ): Task {
        $task ??= new Task();

        if (null !== $name) {
            $task->setName($name);
        }

        if (null !== $description) {
            $task->setDescription($description);
        }

        if (null !== $tagIds) {
            $tags = $this->tagService->findByIds($tagIds);

            foreach ($task->getTags() as $taskTag) {
                if (!$tags->contains($taskTag)) {
                    $task->removeTag($taskTag);
                }
            }

            foreach ($tags as $tag) {
                $task->addTag($tag);
            }
        }

        return $task;
    }
}
