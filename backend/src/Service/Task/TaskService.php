<?php

declare(strict_types=1);

namespace App\Service\Task;

use App\Dto\Task\TaskRequest;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Factory\Task\TaskFactory;
use App\Repository\Task\TaskRepository;
use Doctrine\Common\Collections\ArrayCollection;

class TaskService
{
    final public const NO_DATA_PROVIDED = 'No Task Model or TaskRequest was provided';

    public function __construct(
        private readonly TaskRepository $taskRepository,
    ) {
    }

    /**
     * @throws \Exception
     */
    final public function list(?array $filter): array
    {
        if ($filter) {
            $tasks = new ArrayCollection($this->taskRepository->findByFilters($filter));

            $tasks = $tasks->map(
                function (Task $task) use ($filter) {
                    if (
                        isset($filter['date']) || isset($filter['startDate'], $filter['endDate'])
                    ) {
                        $startDate = new \DateTime($filter['date'] ?? $filter['startDate']);
                        $endDate = new \DateTime($filter['date'] ?? $filter['endDate']);

                        $endDate->setTime(23, 59, 59);

                        $timeLogs = $task->getTimeLogs();

                        $timeLogs = $timeLogs->filter(
                            function (TimeLog $timeLog) use ($startDate, $endDate) {
                                $startTime = $timeLog->getStartTime();
                                $endTime = $timeLog->getEndTime();

                                return ($startDate <= $startTime && $startTime <= $endDate) ||
                                    ($startTime <= $startDate && $startTime >= $endDate) ||
                                    ($endTime >= $startDate && $endTime <= $endDate);
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
                function (Task $task) use ($filter) {
                    $visible = [true];

                    if (
                        \array_key_exists('hideUnreported', $filter) &&
                        filter_var($filter['hideUnreported'], \FILTER_VALIDATE_BOOLEAN)
                    ) {
                        $visible[] = $task->getTimeLogs()->count() > 0;
                    }

                    return (bool) array_product($visible);
                }
            );

            $tasks = [...$tasks->toArray()];
        } else {
            $tasks = $this->taskRepository->findAll();
        }

        return (
            empty($tasks) || [] === $tasks
        ) ? [] : $tasks;
    }

    final public function show(
        string $id
    ): ?Task {
        $task = $this->taskRepository->find($id);

        return $task ?? null;
    }

    final public function new(
        ?TaskRequest $taskRequest = null,
        ?Task $task = null,
        bool $flush = true,
    ): Task {
        if (!$taskRequest && !$task) {
            throw new \RuntimeException(self::NO_DATA_PROVIDED);
        }

        if ($taskRequest && !$task) {
            $task = TaskFactory::create($taskRequest);
        }

        $this->taskRepository->add(
            task: $task,
            flush: $flush
        );

        return $task;
    }

    final public function edit(
        string $id,
        ?TaskRequest $taskRequest = null,
        ?Task $task = null,
        bool $flush = true,
    ): ?Task {
        switch (true) {
            case !$taskRequest && !$task:
                throw new \RuntimeException(self::NO_DATA_PROVIDED);
            case (!$taskRequest && $task) && !$task instanceof Task:
                return null;

            case $taskRequest && !$task:
                $task = $this->taskRepository->find($id);

                if (!$task instanceof Task) {
                    return null;
                }

                $task = TaskFactory::create(
                    taskRequest: $taskRequest,
                    task: $task
                );
                break;
        }

        if ($flush) {
            $this->taskRepository->flush();
        }

        return $task;
    }

    final public function delete(
        string $id,
        bool $flush = true,
    ): bool {
        $task = $this->taskRepository->find($id);

        if (!$task instanceof Task) {
            return false;
        }

        $this->taskRepository->remove(
            task: $task,
            flush: $flush
        );

        return true;
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
}
