<?php

declare(strict_types=1);

namespace App\Utility\Entity;

use DateTimeInterface;
use Doctrine\ORM\Mapping as ORM;

interface EntityBaseInterface
{
    #[
        ORM\PrePersist,
        ORM\PreUpdate
    ]
    public function updatedTimestamps(): void;

    public function getCreatedAt(): ?DateTimeInterface;

    public function setCreatedAt(DateTimeInterface $createdAt): self;

    public function getUpdatedAt(): ?DateTimeInterface;

    public function setUpdatedAt(DateTimeInterface $updatedAt): self;
}
