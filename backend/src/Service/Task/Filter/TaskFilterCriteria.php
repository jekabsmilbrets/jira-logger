<?php

declare(strict_types=1);

namespace App\Service\Task\Filter;

final readonly class TaskFilterCriteria
{
    /**
     * @param string[] $tagIds
     * @param array{startDate: \DateTimeImmutable, endDate: \DateTimeImmutable}|null $dateRange
     */
    public function __construct(
        public array $tagIds = [],
        public ?string $name = null,
        public ?array $dateRange = null,
        public bool $hideUnreported = false,
    ) {
    }

    public function hasQueryFilters(): bool
    {
        return [] !== $this->tagIds || null !== $this->dateRange || null !== $this->name;
    }
}
