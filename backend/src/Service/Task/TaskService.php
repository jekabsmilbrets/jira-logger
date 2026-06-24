<?php

declare(strict_types=1);

namespace App\Service\Task;

use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Repository\Task\TaskRepository;
use App\Service\Task\Filter\TaskFilterCriteria;
use App\Service\Task\Filter\TaskFilterCriteriaFactory;
use App\Service\Task\Input\TaskInput;
use App\Service\Task\JiraSync\TaskJiraSyncAdapter;
use App\Service\Task\JiraSync\TaskJiraSyncException;
use App\Service\Task\Sync\TaskSyncResult;
use App\Service\Task\Write\TaskWriteResult;
use App\Utility\TimeLog\TimeLogRange;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\Common\Collections\ArrayCollection;

class TaskService
{
    final public const NO_DATA_PROVIDED = 'No Task Model or TaskInput was provided';

    public function __construct(
        private readonly TaskRepository $taskRepository,
        private readonly TaskFilterCriteriaFactory $taskFilterCriteriaFactory,
        private readonly TaskJiraSyncAdapter $taskJiraSyncAdapter,
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
        $criteria = $this->taskFilterCriteriaFactory->create($filter);

        if ($criteria->hasQueryFilters()) {
            $tasks = new ArrayCollection($this->taskRepository->findByFilters($criteria));

            $tasks = $tasks->map(
                function (Task $task) use ($criteria) {
                    if (null !== $criteria->dateRange) {
                        $startDate = $criteria->dateRange['startDate'];
                        $endDate = $criteria->dateRange['endDate'];
                        $timeLogs = $task->getTimeLogs();

                        $timeLogs = $timeLogs->filter(
                            function (TimeLog $timeLog) use ($startDate, $endDate) {
                                $startTime = $timeLog->getStartTime();
                                $endTime = $timeLog->getEndTime();

                                return TimeLogRange::overlaps($startDate, $endDate, $startTime, $endTime);
                            }
                        );

                        $timeLogs = $timeLogs->map(
                            function (TimeLog $timeLog) use ($startDate, $endDate) {
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
                            }
                        );

                        $task->setTimeLogs(new ArrayCollection([...$timeLogs->toArray()]));
                    }

                    return $task;
                }
            );

            $tasks = $tasks->filter(
                function (Task $task) use ($criteria) {
                    $visible = [true];

                    if ($criteria->hideUnreported) {
                        $visible[] = $task->getTimeLogs()->count() > 0;
                    }

                    return (bool) array_product($visible);
                }
            );

            $tasks = [...$tasks->toArray()];
        } elseif ($criteria->hideUnreported) {
            $tasks = array_values(
                array_filter(
                    $this->taskRepository->findAll(),
                    static fn (Task $task): bool => $task->getTimeLogs()->count() > 0
                )
            );
        } else {
            $tasks = $this->taskRepository->findAll();
        }

        return empty($tasks) ? [] : $tasks;
    }

    final public function show(
        string $id
    ): ?Task {
        $task = $this->taskRepository->find($id);

        return $task ?? null;
    }

    final public function create(TaskInput $taskInput): TaskWriteResult
    {
        $task = $this->applyInput($taskInput);

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

    final public function update(string $id, TaskInput $taskInput): TaskWriteResult
    {
        $task = $this->taskRepository->find($id);

        if (!$task instanceof Task) {
            return TaskWriteResult::notFound();
        }

        $task = $this->applyInput($taskInput, $task);

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

    final public function syncWithJira(string $id, string $date): TaskSyncResult
    {
        $task = $this->show($id);

        if (!$task instanceof Task) {
            return TaskSyncResult::notFound();
        }

        try {
            $synced = $this->taskJiraSyncAdapter->syncTask($task, $date);
        } catch (TaskJiraSyncException $e) {
            return TaskSyncResult::failed($e->getMessage());
        }

        return $synced ? TaskSyncResult::synced() : TaskSyncResult::conflict();
    }

    private function applyInput(TaskInput $taskInput, ?Task $task = null): Task
    {
        $task ??= new Task();

        if (null !== $taskInput->name) {
            $task->setName($taskInput->name);
        }

        if (null !== $taskInput->description) {
            $task->setDescription($taskInput->description);
        }

        if (null !== $taskInput->tags) {
            foreach ($task->getTags() as $taskTag) {
                if (!$taskInput->tags->contains($taskTag)) {
                    $task->removeTag($taskTag);
                }
            }

            foreach ($taskInput->tags as $tag) {
                $task->addTag($tag);
            }
        }

        return $task;
    }
}
