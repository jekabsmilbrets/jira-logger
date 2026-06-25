<?php

declare(strict_types=1);

namespace App\Service\Task\Write;

use App\Entity\Task\Task;

final readonly class TaskWriteResult
{
    private function __construct(
        public TaskWriteStatus $status,
        public ?Task $task = null,
    ) {
    }

    public static function created(Task $task): self
    {
        return new self(TaskWriteStatus::Created, $task);
    }

    public static function updated(Task $task): self
    {
        return new self(TaskWriteStatus::Updated, $task);
    }

    public static function deleted(): self
    {
        return new self(TaskWriteStatus::Deleted);
    }

    public static function notFound(): self
    {
        return new self(TaskWriteStatus::NotFound);
    }

    public static function duplicate(): self
    {
        return new self(TaskWriteStatus::Duplicate);
    }

    public static function failed(): self
    {
        return new self(TaskWriteStatus::Failed);
    }
}
