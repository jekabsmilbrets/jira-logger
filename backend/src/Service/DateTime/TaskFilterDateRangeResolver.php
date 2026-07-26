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
     * @return array{startDate: DateTimeImmutable, endDate: DateTimeImmutable}|null
     */
    public function resolve(
        ?string $date = null,
        ?string $startDate = null,
        ?string $endDate = null,
    ): ?array
    {
        if (null === $date && (null === $startDate || null === $endDate)) {
            return null;
        }

        $timezone = new DateTimeZone($this->userTimezoneResolver->resolveCurrentUserTimezone());
        $utcTimezone = new DateTimeZone('UTC');
        $startValue = $this->normalizeDateValue($date ?? $startDate);
        $endValue = $this->normalizeDateValue($date ?? $endDate);

        $startDate = new DateTimeImmutable($startValue, $timezone);
        $endDate = new DateTimeImmutable($endValue, $timezone);

        if (null !== $date || preg_match('/^\d{4}-\d{2}-\d{2}$/', $startValue)) {
            $startDate = $startDate->setTime(0, 0, 0);
        }

        if (null !== $date || preg_match('/^\d{4}-\d{2}-\d{2}$/', $endValue)) {
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
