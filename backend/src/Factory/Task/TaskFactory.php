<?php

declare(strict_types=1);

namespace App\Factory\Task;

use App\Dto\Task\TaskRequest;
use App\Entity\Task\Task;

class TaskFactory
{
    final public static function create(
        TaskRequest $taskRequest,
        ?Task       $task = null
    ): Task {
        if (null === $task) {
            $task = new Task();
        }

        if (null !== ($name = $taskRequest->getName())) {
            $task->setName($name);
        }

        if (null !== ($description = $taskRequest->getDescription())) {
            $task->setDescription($description);
        }

        if (null !== ($tags = $taskRequest->getTags())) {
            $taskTags = $task->getTags();

            foreach ($taskTags as $taskTag) {
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
