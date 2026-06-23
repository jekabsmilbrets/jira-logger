<?php

declare(strict_types=1);

namespace App\Service\Task\Sync;

final readonly class TaskSyncResult
{
    private function __construct(
        public TaskSyncStatus $status,
        public ?string $errorMessage = null,
    ) {
    }

    public static function synced(): self
    {
        return new self(TaskSyncStatus::Synced);
    }

    public static function conflict(): self
    {
        return new self(TaskSyncStatus::Conflict);
    }

    public static function notFound(): self
    {
        return new self(TaskSyncStatus::NotFound);
    }

    public static function failed(string $errorMessage): self
    {
        return new self(TaskSyncStatus::Failed, $errorMessage);
    }
}
