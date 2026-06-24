<?php

declare(strict_types=1);

namespace App\Service\DateTime;

use DateTimeImmutable;
use DateTimeZone;

class TaskFilterDateRangeResolver
{
    public function __construct(
        private readonly UserTimezoneResolver $userTimezoneResolver,
        private readonly DateInputParser $dateInputParser,
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
        $startValue = $this->normalizeDateValue((string) ($filter['date'] ?? $filter['startDate']));
        $endValue = $this->normalizeDateValue((string) ($filter['date'] ?? $filter['endDate']));

        $startDate = new DateTimeImmutable($startValue, $timezone);
        $endDate = new DateTimeImmutable($endValue, $timezone);

        if (isset($filter['date']) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $startValue)) {
            $startDate = $startDate->setTime(0, 0, 0);
        }

        if (isset($filter['date']) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $endValue)) {
            $endDate = $endDate->setTime(23, 59, 59);
        }

        return [
            'startDate' => $startDate->setTimezone($utcTimezone),
            'endDate' => $endDate->setTimezone($utcTimezone),
        ];
    }

    private function normalizeDateValue(string $value): string
    {
        if ($this->looksLikeDateOnly($value)) {
            return $this->dateInputParser->parseDate($value) ?? $value;
        }

        return $this->dateInputParser->parseDateTime($value) ?? $value;
    }

    private function looksLikeDateOnly(string $value): bool
    {
        $value = trim($value);

        if ('' === $value || ctype_digit($value)) {
            return false;
        }

        return !str_contains($value, ':') && !str_contains($value, 'T');
    }
}
