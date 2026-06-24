<?php

declare(strict_types=1);

namespace App\Service\Task\TimeLog;

use App\Entity\Task\TimeLog\TimeLog;

final readonly class TimeLogWriteResult
{
    private function __construct(
        public TimeLogWriteStatus $status,
        public ?TimeLog $timeLog = null,
    ) {
    }

    public static function created(TimeLog $timeLog): self
    {
        return new self(TimeLogWriteStatus::Created, $timeLog);
    }

    public static function updated(TimeLog $timeLog): self
    {
        return new self(TimeLogWriteStatus::Updated, $timeLog);
    }

    public static function deleted(): self
    {
        return new self(TimeLogWriteStatus::Deleted);
    }

    public static function notFound(): self
    {
        return new self(TimeLogWriteStatus::NotFound);
    }

    public static function failed(): self
    {
        return new self(TimeLogWriteStatus::Failed);
    }
}
