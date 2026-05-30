<?php

declare(strict_types=1);

namespace App\Dto\Task;

use DateTimeImmutable;
use Symfony\Component\Validator\Constraints as Assert;

class TaskListFilterRequest
{
    #[Assert\Type(type: 'string', groups: ['list'])]
    private ?string $tags = null;

    #[Assert\Type(type: 'string', groups: ['list'])]
    private ?string $name = null;

    #[Assert\Date(groups: ['list'])]
    private ?string $date = null;

    #[Assert\AtLeastOneOf(
        constraints: [
            new Assert\Date(),
            new Assert\DateTime(format: 'Y-m-d H:i:s'),
        ],
        groups: ['list'],
    )]
    private ?string $startDate = null;

    #[Assert\AtLeastOneOf(
        constraints: [
            new Assert\Date(),
            new Assert\DateTime(format: 'Y-m-d H:i:s'),
        ],
        groups: ['list'],
    )]
    private ?string $endDate = null;

    #[Assert\Type(type: 'bool', groups: ['list'])]
    private ?bool $hideUnreported = null;

    public function getTags(): ?string
    {
        return $this->tags;
    }

    public function setTags(?string $tags): self
    {
        $this->tags = $tags;

        return $this;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(?string $name): self
    {
        $this->name = $name;

        return $this;
    }

    public function getDate(): ?string
    {
        return $this->date;
    }

    public function setDate(?string $date): self
    {
        $this->date = $this->normalizeDateInput($date, false);

        return $this;
    }

    public function getStartDate(): ?string
    {
        return $this->startDate;
    }

    public function setStartDate(?string $startDate): self
    {
        $this->startDate = $this->normalizeDateInput($startDate, true);

        return $this;
    }

    public function getEndDate(): ?string
    {
        return $this->endDate;
    }

    public function setEndDate(?string $endDate): self
    {
        $this->endDate = $this->normalizeDateInput($endDate, true);

        return $this;
    }

    private function normalizeDateInput(?string $value, bool $preserveTime): ?string
    {
        if (null === $value) {
            return null;
        }

        $value = trim($value);
        if ('' === $value) {
            return $value;
        }

        if (ctype_digit($value)) {
            $timestamp = (int) $value;
            if (strlen($value) === 13) {
                $timestamp = (int) floor($timestamp / 1000);
            }

            return (new DateTimeImmutable('@'.$timestamp))->format($preserveTime ? 'Y-m-d H:i:s' : 'Y-m-d');
        }

        $formats = [
            'Y-m-d',
            DATE_ATOM,
            \DateTimeInterface::RFC3339,
            \DateTimeInterface::RFC3339_EXTENDED,
            'Y-m-d\TH:i:s.uP',
            'Y-m-d\TH:i:s\Z',
            'Y-m-d\TH:i:s.u\Z',
            'Y-m-d H:i:s',
            'm/d/Y',
        ];

        foreach ($formats as $format) {
            $date = DateTimeImmutable::createFromFormat($format, $value);
            if ($date instanceof DateTimeImmutable) {
                return $date->format($preserveTime ? 'Y-m-d H:i:s' : 'Y-m-d');
            }
        }

        try {
            return (new DateTimeImmutable($value))->format($preserveTime ? 'Y-m-d H:i:s' : 'Y-m-d');
        } catch (\Throwable) {
            return $value;
        }
    }

    public function getHideUnreported(): ?bool
    {
        return $this->hideUnreported;
    }

    public function setHideUnreported(bool|string|null $hideUnreported): self
    {
        if (\is_string($hideUnreported)) {
            $normalized = filter_var($hideUnreported, \FILTER_VALIDATE_BOOLEAN, \FILTER_NULL_ON_FAILURE);
            $this->hideUnreported = \is_bool($normalized) ? $normalized : null;

            return $this;
        }

        $this->hideUnreported = $hideUnreported;

        return $this;
    }

    public function toFilterArray(): array
    {
        $filter = [
            'tags' => $this->tags,
            'name' => $this->name,
            'date' => $this->date,
            'startDate' => $this->startDate,
            'endDate' => $this->endDate,
            'hideUnreported' => $this->hideUnreported,
        ];

        return array_filter(
            $filter,
            static fn ($value): bool => null !== $value
        );
    }
}
