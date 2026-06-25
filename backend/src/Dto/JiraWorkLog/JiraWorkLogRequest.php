<?php

declare(strict_types=1);

namespace App\Dto\JiraWorkLog;

use OpenApi\Attributes as OA;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

class JiraWorkLogRequest
{
    #[
        Groups(['create', 'update']),
        Assert\Length(
            max: 255,
            groups: ['create', 'update'],
        ),
        Assert\Type(
            type: 'string',
            groups: ['create', 'update'],
        ),
        OA\Property(example: 'JIRA-RE-DOCKER-1 Technical idea')
    ]
    private ?string $description = null;

    #[
        Groups(['create', 'update']),
        Assert\NotNull(groups: ['create', 'update']),
        Assert\NotBlank(groups: ['create', 'update']),
        Assert\Type(
            type: 'string',
            groups: ['create', 'update'],
        ),
        Assert\Uuid(groups: ['create', 'update']),
        OA\Property(
            description: 'UUID of the Task',
            type: 'uuid',
            example: '9dab258b-46ff-4ad7-a8a0-b9f2b6f84aa1',
            nullable: false
        )
    ]
    private ?string $task = null;

    #[
        Groups(['create', 'update']),
        Assert\NotNull(groups: ['create', 'update']),
        Assert\NotBlank(groups: ['create', 'update']),
        Assert\Type(
            type: 'integer',
            groups: ['create', 'update'],
        ),
        OA\Property(
            description: 'Time spent in seconds',
            type: 'integer',
            example: '960',
            nullable: false
        )
    ]
    private ?int $timeSpentSeconds = null;

    final public function getDescription(): ?string
    {
        return $this->description;
    }

    final public function setDescription(?string $description): self
    {
        $this->description = $description;

        return $this;
    }

    final public function getTask(): ?string
    {
        return $this->task;
    }

    final public function setTask(mixed $taskId): self
    {
        if (!\is_scalar($taskId)) {
            $this->task = '';

            return $this;
        }

        $this->task = (string) $taskId;

        return $this;
    }

    final public function getTimeSpentSeconds(): ?int
    {
        return $this->timeSpentSeconds;
    }

    final public function setTimeSpentSeconds(?int $timeSpentSeconds): self
    {
        $this->timeSpentSeconds = $timeSpentSeconds;

        return $this;
    }
}
