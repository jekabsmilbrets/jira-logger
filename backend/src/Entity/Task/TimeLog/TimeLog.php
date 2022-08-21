<?php

declare(strict_types=1);

namespace App\Entity\Task\TimeLog;

use App\Entity\Task\Task;
use App\Repository\Task\TimeLog\TimeLogRepository;
use App\Utility\Entity\EntityBaseInterface;
use App\Utility\Traits\BaseEntityTrait;
use DateTimeInterface;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use OpenApi\Attributes as OA;
use Symfony\Component\Serializer\Annotation\Context;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Serializer\Annotation\MaxDepth;
use Symfony\Component\Serializer\Normalizer\DateTimeNormalizer;

#[
    ORM\Entity(repositoryClass: TimeLogRepository::class),
    ORM\HasLifecycleCallbacks
]
class TimeLog implements EntityBaseInterface
{
    use BaseEntityTrait;

    #[
        Groups(['list']),
        ORM\Column(
            type: Types::DATETIME_MUTABLE
        ),
        Context([DateTimeNormalizer::FORMAT_KEY => DateTimeInterface::ATOM])
    ]
    private ?DateTimeInterface $startTime = null;

    #[
        Groups(['list']),
        ORM\Column(
            type: Types::DATETIME_MUTABLE,
            nullable: true
        ),
        Context([DateTimeNormalizer::FORMAT_KEY => DateTimeInterface::ATOM])
    ]
    private ?DateTimeInterface $endTime = null;

    #[
        Groups(['list']),
        ORM\Column(
            length: 255,
            nullable: true
        )
    ]
    private ?string $description = null;

    #[
        MaxDepth(1),
        ORM\ManyToOne(
            targetEntity: Task::class,
            inversedBy: 'timeLogs'
        ),
        ORM\JoinColumn(
            nullable: false
        ),
        OA\Property(ref: '#/components/schemas/TaskModel')
    ]
    private ?Task $task = null;

    final public function getStartTime(): ?DateTimeInterface
    {
        return $this->startTime;
    }

    final public function setStartTime(DateTimeInterface $dateTime): self
    {
        $this->startTime = $dateTime;

        return $this;
    }

    final public function getEndTime(): ?DateTimeInterface
    {
        return $this->endTime;
    }

    final public function setEndTime(?DateTimeInterface $dateTime): self
    {
        $this->endTime = $dateTime;

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

    final public function getTask(): ?Task
    {
        return $this->task;
    }

    final public function setTask(?Task $task): self
    {
        $this->task = $task;

        return $this;
    }
}
