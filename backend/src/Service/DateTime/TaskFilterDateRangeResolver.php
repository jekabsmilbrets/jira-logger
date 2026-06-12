<?php

declare(strict_types=1);

namespace App\Service\DateTime;

use DateTimeImmutable;
use DateTimeZone;

class TaskFilterDateRangeResolver
{
    public function __construct(
        private readonly UserTimezoneResolver $userTimezoneResolver,
    ) {
    }

    /**
     * @param array<string, mixed> $filter
     *
     * @return array{startDate: DateTimeImmutable, endDate: DateTimeImmutable}|null
     */
    public function resolve(array $filter): ?array
    {
        if (!isset($filter['date']) && !isset($filter['startDate'], $filter['endDate'])) {
            return null;
        }

        $timezone = new DateTimeZone($this->userTimezoneResolver->resolveCurrentUserTimezone());
        $utcTimezone = new DateTimeZone('UTC');
        $startValue = (string) ($filter['date'] ?? $filter['startDate']);
        $endValue = (string) ($filter['date'] ?? $filter['endDate']);

        $startDate = new DateTimeImmutable($startValue, $timezone);
        $endDate = new DateTimeImmutable($endValue, $timezone);

        if (isset($filter['date']) || preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($filter['date'] ?? $filter['startDate'] ?? ''))) {
            $startDate = $startDate->setTime(0, 0, 0);
        }

        if (isset($filter['date']) || preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($filter['endDate'] ?? ''))) {
            $endDate = $endDate->setTime(23, 59, 59);
        }

        return [
            'startDate' => $startDate->setTimezone($utcTimezone),
            'endDate' => $endDate->setTimezone($utcTimezone),
        ];
    }
}
