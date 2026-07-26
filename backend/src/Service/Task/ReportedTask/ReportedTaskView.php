<?php

declare(strict_types=1);

namespace App\Service\Task\ReportedTask;

use App\Utility\Constants\Group;
use Symfony\Component\Serializer\Attribute\Groups;

final readonly class ReportedTaskView
{
    /**
     * @param array<int, array<string, mixed>> $timeLogs
     * @param array<int, array<string, mixed>> $tags
     * @param array<string, mixed>|null        $lastTimeLog
     * @param array<int, array<string, mixed>> $jiraWorkLogs
     */
    public function __construct(
        #[Groups([Group::LIST])]
        public ?string $name,
        #[Groups([Group::LIST])]
        public ?string $description,
        #[Groups([Group::LIST])]
        public array $timeLogs,
        #[Groups([Group::LIST])]
        public array $tags,
        #[Groups([Group::LIST])]
        public ?array $lastTimeLog,
        #[Groups([Group::LIST])]
        public array $jiraWorkLogs,
        #[Groups([Group::LIST])]
        public string $id,
        #[Groups([Group::LIST])]
        public ?\DateTimeImmutable $createdAt,
        #[Groups([Group::LIST])]
        public ?\DateTimeImmutable $updatedAt,
    ) {
    }
}
