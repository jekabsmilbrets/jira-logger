<?php

declare(strict_types=1);

namespace App\Service\Task;

use App\Dto\Task\TaskRequest;
use App\Entity\Task\Task;
use App\Factory\Task\TaskFactory;
use App\Repository\Task\TaskRepository;
use RuntimeException;

class TaskService
{
    final public const NO_DATA_PROVIDED = 'No Task Model or TaskRequest was provided';

    public function __construct(
        private readonly TaskRepository $taskRepository,
    ) {
    }

    final public function list(): ?array
    {
        $tasks = $this->taskRepository->findAll();

        if (empty($tasks) || [] === $tasks) {
            return null;
        }

        return $tasks;
    }

    final public function show(
        string $id
    ): ?Task {
        $task = $this->taskRepository->find($id);

        return $task ?? null;
    }

    final public function new(
        ?TaskRequest $taskRequest = null,
        ?Task        $task = null,
        bool         $flush = true,
    ): Task {
        if (!$taskRequest && !$task) {
            throw new RuntimeException(self::NO_DATA_PROVIDED);
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
        string       $id,
        ?TaskRequest $taskRequest = null,
        ?Task        $task = null,
        bool         $flush = true,
    ): ?Task {
        switch (true) {
            case !$taskRequest && !$task:
                throw new RuntimeException(self::NO_DATA_PROVIDED);
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
        bool   $flush = true,
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
}
