<?php

declare(strict_types=1);

namespace App\Dto\JiraWorkLog;

use App\Entity\Task\Task;
use App\Service\Task\TaskService;
use OpenApi\Attributes as OA;
use Symfony\Component\Serializer\Annotation\Groups;
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
            type: Task::class,
            groups: ['create', 'update'],
        ),
        OA\Property(
            description: 'UUID of the Task',
            type: 'uuid',
            example: '9dab258b-46ff-4ad7-a8a0-b9f2b6f84aa1',
            nullable: false
        )
    ]
    private ?Task $task = null;

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

    public function __construct(
        private readonly TaskService $taskService,
    )
    {
    }

    final public function getDescription(): ?string
    {
        return $this->description;
    }

    final public function setDescription(?string $description): self
    {
        $this->description = $description;

        return $this;
    }

    final public function getTask(): ?Task
    {
        return $this->task;
    }

    final public function setTask(?string $taskId): self
    {
        if (($task = $this->taskService->show($taskId)) !== null) {
            $this->task = $task;
        }

        return $this;
    }

    final public function getTimeSpentSeconds(): ?int
    {
        return $this->timeSpentSeconds;
    }

    final public function setTimeSpentSeconds(?int $timeSpentSeconds): JiraWorkLogRequest
    {
        $this->timeSpentSeconds = $timeSpentSeconds;

        return $this;
    }
}