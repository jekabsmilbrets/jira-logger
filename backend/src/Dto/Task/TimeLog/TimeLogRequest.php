<?php

declare(strict_types=1);

namespace App\Dto\Task\TimeLog;

use App\Entity\Task\Task;
use App\Service\DateTime\DateInputParser;
use App\Service\Task\TaskService;
use DateTimeImmutable;
use App\Validator\Constraints\FlexibleDateTime;
use OpenApi\Attributes as OA;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

class TimeLogRequest
{
    #[
        Groups(['create', 'update']),
        Assert\NotNull(groups: ['create', 'update']),
        Assert\NotBlank(groups: ['create', 'update']),
        Assert\Type(
            type: 'string',
            groups: ['create', 'update'],
        ),
        FlexibleDateTime(groups: ['create', 'update']),
        OA\Property(
            type: 'string',
            format: 'date-time',
            description: 'Accepted formats: Unix timestamp (seconds/milliseconds), ISO-8601/RFC3339, Y-m-d H:i:s, Y-m-d, d/m/Y',
        )
    ]
    private ?string $startTime = null;
    private ?DateTimeImmutable $startTimeValue = null;

    #[
        Groups(['create', 'update']),
        Assert\Type(
            type: 'string',
            groups: ['create', 'update'],
        ),
        FlexibleDateTime(groups: ['create', 'update']),
        OA\Property(
            type: 'string',
            format: 'date-time',
            description: 'Accepted formats: Unix timestamp (seconds/milliseconds), ISO-8601/RFC3339, Y-m-d H:i:s, Y-m-d, d/m/Y',
        )
    ]
    private ?string $endTime = null;
    private ?DateTimeImmutable $endTimeValue = null;

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
        OA\Property(example: 'JIRA-RE-DOCKER-1 TimeLog Technical idea')
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

    public function __construct(
        private readonly TaskService $taskService,
        private readonly DateInputParser $dateInputParser,
    ) {
    }

    final public function getStartTime(): ?string
    {
        return $this->startTime;
    }

    final public function setStartTime(mixed $startTime): self
    {
        if (!\is_scalar($startTime)) {
            $this->startTime = '';
            $this->startTimeValue = null;

            return $this;
        }

        $startTime = (string) $startTime;

        try {
            $this->startTime = $this->dateInputParser->parseDateTime($startTime);
            $this->startTimeValue = $this->dateInputParser->parseDateTimeObject($startTime);
        } catch (\Throwable) {
            $this->startTime = $startTime;
            $this->startTimeValue = null;
        }

        return $this;
    }

    final public function getStartTimeValue(): ?DateTimeImmutable
    {
        return $this->startTimeValue;
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

    final public function getEndTime(): ?string
    {
        return $this->endTime;
    }

    final public function setEndTime(mixed $endTime): self
    {
        if (!\is_scalar($endTime)) {
            $this->endTime = '';
            $this->endTimeValue = null;

            return $this;
        }

        $endTime = (string) $endTime;

        try {
            $this->endTime = $this->dateInputParser->parseDateTime($endTime);
            $this->endTimeValue = $this->dateInputParser->parseDateTimeObject($endTime);
        } catch (\Throwable) {
            $this->endTime = $endTime;
            $this->endTimeValue = null;
        }

        return $this;
    }

    final public function getEndTimeValue(): ?DateTimeImmutable
    {
        return $this->endTimeValue;
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

    #[Assert\Callback]
    final public function validateChronology(ExecutionContextInterface $context): void
    {
        if (null === $this->endTime || null === $this->startTime) {
            return;
        }

        try {
            $startTime = $this->startTimeValue ?? new \DateTimeImmutable($this->startTime);
            $endTime = $this->endTimeValue ?? new \DateTimeImmutable($this->endTime);
        } catch (\Throwable) {
            return;
        }

        if ($endTime <= $startTime) {
            $context
                ->buildViolation('End time must be later than start time.')
                ->atPath('endTime')
                ->addViolation();
        }
    }
}
