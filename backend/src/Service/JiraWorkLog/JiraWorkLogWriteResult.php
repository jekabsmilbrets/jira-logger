<?php

declare(strict_types=1);

namespace App\Service\JiraWorkLog;

use App\Entity\JiraWorkLog\JiraWorkLog;

final readonly class JiraWorkLogWriteResult
{
    private function __construct(
        public JiraWorkLogWriteStatus $status,
        public ?JiraWorkLog $jiraWorkLog = null,
    ) {
    }

    public static function created(JiraWorkLog $jiraWorkLog): self
    {
        return new self(JiraWorkLogWriteStatus::Created, $jiraWorkLog);
    }

    public static function updated(JiraWorkLog $jiraWorkLog): self
    {
        return new self(JiraWorkLogWriteStatus::Updated, $jiraWorkLog);
    }

    public static function deleted(): self
    {
        return new self(JiraWorkLogWriteStatus::Deleted);
    }

    public static function duplicate(): self
    {
        return new self(JiraWorkLogWriteStatus::Duplicate);
    }

    public static function notFound(): self
    {
        return new self(JiraWorkLogWriteStatus::NotFound);
    }

    public static function failed(): self
    {
        return new self(JiraWorkLogWriteStatus::Failed);
    }
}
