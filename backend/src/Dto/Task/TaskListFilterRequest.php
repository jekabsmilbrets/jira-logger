<?php

declare(strict_types=1);

namespace App\Dto\Task;

use App\Service\DateTime\DateInputParser;
use App\Validator\Constraints\FlexibleDate;
use App\Validator\Constraints\FlexibleDateTime;
use Symfony\Component\Validator\Constraints as Assert;

class TaskListFilterRequest
{
    public function __construct(
        private readonly DateInputParser $dateInputParser,
    ) {
    }

    #[Assert\Type(type: 'string', groups: ['list'])]
    private ?string $tags = null;

    #[Assert\Type(type: 'string', groups: ['list'])]
    private ?string $name = null;

    #[FlexibleDate(groups: ['list'])]
    private ?string $date = null;

    #[FlexibleDateTime(groups: ['list'])]
    private ?string $startDate = null;

    #[FlexibleDateTime(groups: ['list'])]
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
        $this->date = $this->tryParseDate($date);

        return $this;
    }

    public function getStartDate(): ?string
    {
        return $this->startDate;
    }

    public function setStartDate(?string $startDate): self
    {
        $this->startDate = $this->tryParseDateTime($startDate);

        return $this;
    }

    public function getEndDate(): ?string
    {
        return $this->endDate;
    }

    public function setEndDate(?string $endDate): self
    {
        $this->endDate = $this->tryParseDateTime($endDate);

        return $this;
    }

    private function tryParseDate(?string $value): ?string
    {
        try {
            return $this->dateInputParser->parseDate($value);
        } catch (\Throwable) {
            return $value;
        }
    }

    private function tryParseDateTime(?string $value): ?string
    {
        try {
            return $this->dateInputParser->parseDateTime($value);
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
