<?php

declare(strict_types=1);

namespace App\Service\Task;

use App\Entity\Task\Task;
use App\Repository\Task\TaskRepository;
use App\Service\Tag\TagService;
use App\Service\Task\Write\TaskWriteResult;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;

class TaskService
{
    public function __construct(
        private readonly TaskRepository $taskRepository,
        private readonly TagService $tagService,
    ) {
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
