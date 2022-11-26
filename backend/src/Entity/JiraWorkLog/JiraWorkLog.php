<?php

declare(strict_types=1);

namespace App\Entity\JiraWorkLog;

use App\Entity\Task\Task;
use App\Repository\JiraWorkLog\JiraWorkLogRepository;
use App\Utility\Constants\Group;
use App\Utility\Entity\EntityBaseInterface;
use App\Utility\Traits\BaseEntityTrait;
use DateTimeInterface;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use OpenApi\Attributes as OA;
use Symfony\Component\Serializer\Annotation\Context;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Serializer\Annotation\Ignore;
use Symfony\Component\Serializer\Annotation\MaxDepth;
use Symfony\Component\Serializer\Normalizer\DateTimeNormalizer;

#[
    ORM\Entity(repositoryClass: JiraWorkLogRepository::class),
    ORM\HasLifecycleCallbacks,
]
class JiraWorkLog implements EntityBaseInterface
{
    use BaseEntityTrait;

    #[
        Groups([Group::LIST]),
        MaxDepth(1),
        Ignore,
        ORM\ManyToOne(inversedBy: 'jiraWorkLogs'),
        ORM\JoinColumn(nullable: false),
        OA\Property(
            type: 'array',
            items: new OA\Items(ref: '#/components/schemas/TaskModel')
        ),
    ]
    private ?Task $task = null;

    #[
        Groups([Group::LIST]),
        ORM\Column(length: 255),
        OA\Property(type: 'string')
    ]
    private ?string $workLogId = null;

    #[
        Groups([Group::LIST]),
        ORM\Column(
            length: 255,
            nullable: true
        ),
        OA\Property(type: 'string')
    ]
    private ?string $description = null;

    #[
        Groups([Group::LIST]),
        ORM\Column,
        OA\Property(type: 'integer')
    ]
    private ?int $timeSpentSeconds = null;

    #[
        Groups([Group::LIST]),
        ORM\Column(type: Types::DATE_MUTABLE),
        Context([DateTimeNormalizer::FORMAT_KEY => \DateTimeInterface::ATOM])
    ]
    private ?\DateTimeInterface $startTime = null;

    final public function getTask(): ?Task
    {
        return $this->task;
    }

    final public function setTask(?Task $task): self
    {
        $this->task = $task;

        return $this;
    }

    final public function getWorkLogId(): ?string
    {
        return $this->workLogId;
    }

    final public function setWorkLogId(string $workLogId): self
    {
        $this->workLogId = $workLogId;

        return $this;
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

    final public function getTimeSpentSeconds(): ?int
    {
        return $this->timeSpentSeconds;
    }

    final public function setTimeSpentSeconds(int $timeSpentSeconds): self
    {
        $this->timeSpentSeconds = $timeSpentSeconds;

        return $this;
    }

    final public function getStartTime(): ?\DateTimeInterface
    {
        return $this->startTime;
    }

    final public function setStartTime(\DateTimeInterface $startTime): self
    {
        $this->startTime = $startTime;

        return $this;
    }

    final public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'task' => $this->getTask(),
            'workLogId' => $this->getWorkLogId(),
            'description' => $this->getDescription(),
            'timeSpentSeconds' => $this->getTimeSpentSeconds(),
            'startTime' => $this->getStartTime(),
        ];
    }
}
