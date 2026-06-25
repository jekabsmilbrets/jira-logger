<?php

declare(strict_types=1);

namespace App\Service\Task\Filter;

use App\Service\DateTime\TaskFilterDateRangeResolver;
use Ramsey\Uuid\Uuid;

final readonly class TaskFilterCriteriaFactory
{
    public function __construct(
        private TaskFilterDateRangeResolver $taskFilterDateRangeResolver,
    ) {
    }

    /**
     * @param array<string, mixed>|null $filter
     *
     * @throws \Exception
     */
    public function create(?array $filter): TaskFilterCriteria
    {
        if (empty($filter)) {
            return new TaskFilterCriteria();
        }

        return new TaskFilterCriteria(
            tagIds: $this->tagIds($filter['tags'] ?? null),
            name: $this->name($filter['name'] ?? null),
            dateRange: $this->taskFilterDateRangeResolver->resolveTaskFilter($filter),
            hideUnreported: $this->hideUnreported($filter['hideUnreported'] ?? null),
        );
    }

    /**
     * @return string[]
     */
    private function tagIds(mixed $tags): array
    {
        if (!\is_string($tags)) {
            return [];
        }

        return array_values(
            array_filter(
                array_map(
                    static fn (string $tag): string => trim($tag),
                    explode(',', $tags)
                ),
                static fn (string $uuid): bool => Uuid::isValid($uuid)
            )
        );
    }

    private function name(mixed $name): ?string
    {
        if (!\is_string($name)) {
            return null;
        }

        $name = trim($name);

        return '' === $name ? null : $name;
    }

    private function hideUnreported(mixed $hideUnreported): bool
    {
        return filter_var($hideUnreported, \FILTER_VALIDATE_BOOLEAN);
    }
}
