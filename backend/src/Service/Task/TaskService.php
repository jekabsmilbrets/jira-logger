<?php

declare(strict_types=1);

namespace App\Service\Task;

use App\Entity\Task\Task;
use App\Repository\Task\TaskRepository;
use App\Service\Task\Filter\TaskFilterCriteria;
use App\Service\Task\Filter\TaskFilterCriteriaFactory;
use App\Service\Task\Input\TaskInput;
use App\Service\Task\JiraSync\TaskJiraSyncAdapter;
use App\Service\Task\JiraSync\TaskJiraSyncException;
use App\Service\Task\Projection\TaskListProjection;
use App\Service\Task\Sync\TaskSyncResult;
use App\Service\Task\Write\TaskWriteResult;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;

class TaskService
{
    final public const NO_DATA_PROVIDED = 'No Task Model or TaskInput was provided';

    public function __construct(
        private readonly TaskRepository $taskRepository,
        private readonly TaskFilterCriteriaFactory $taskFilterCriteriaFactory,
        private readonly TaskJiraSyncAdapter $taskJiraSyncAdapter,
        private readonly TaskListProjection $taskListProjection,
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
            $tasks = $this->taskRepository->findByFilters($criteria);
        } else {
            $tasks = $this->taskRepository->findAll();
        }

        return $this->taskListProjection->project($tasks, $criteria);
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
