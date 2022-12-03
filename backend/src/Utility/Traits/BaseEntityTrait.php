<?php

declare(strict_types=1);

namespace App\Utility\Traits;

use App\Utility\Constants\Group;
use DateTimeInterface;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use OpenApi\Attributes as OA;
use Ramsey\Uuid\Doctrine\UuidGenerator;
use Symfony\Component\Serializer\Annotation\Context;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Serializer\Normalizer\DateTimeNormalizer;

trait BaseEntityTrait
{
    #[
        Groups([Group::LIST]),
        ORM\Id,
        ORM\GeneratedValue(
            strategy: 'CUSTOM'
        ),
        ORM\CustomIdGenerator(UuidGenerator::class),
        ORM\Column(
            type: 'uuid',
            unique: true
        ),
        OA\Property(
            type: 'uuid',
            example: '9dab258b-46ff-4ad7-a8a0-b9f2b6f84aa1'
        )
    ]
    private string $id;

    #[
        Groups([Group::LIST]),
        ORM\Column(
            type: Types::DATETIME_MUTABLE,
            nullable: false
        ),
        Context([DateTimeNormalizer::FORMAT_KEY => \DateTimeInterface::ATOM]),
        OA\Property(
            type: 'string',
            format: 'date-time',
        )
    ]
    private ?\DateTimeInterface $createdAt = null;

    #[
        Groups([Group::LIST]),
        ORM\Column(
            type: Types::DATETIME_MUTABLE,
            nullable: false
        ),
        Context([DateTimeNormalizer::FORMAT_KEY => \DateTimeInterface::ATOM]),
        OA\Property(
            type: 'string',
            format: 'date-time',
        )
    ]
    private ?\DateTimeInterface $updatedAt = null;

    final public function getId(): string
    {
        return $this->id;
    }

    #[
        ORM\PrePersist,
        ORM\PreUpdate
    ]
    final public function updatedTimestamps(): void
    {
        $dateTime = new \DateTime('now');

        $this->setUpdatedAt($dateTime);

        if (null === $this->getCreatedAt()) {
            $this->setCreatedAt($dateTime);
        }
    }

    final public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    final public function setCreatedAt(\DateTimeInterface $createdAt): self
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    final public function getUpdatedAt(): ?\DateTimeInterface
    {
        return $this->updatedAt;
    }

    final public function setUpdatedAt(\DateTimeInterface $updatedAt): self
    {
        $this->updatedAt = $updatedAt;

        return $this;
    }
}
