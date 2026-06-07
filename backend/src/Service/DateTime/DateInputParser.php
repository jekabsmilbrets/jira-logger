<?php

declare(strict_types=1);

namespace App\Service\DateTime;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;

class DateInputParser
{
    public function __construct(
        private readonly UserTimezoneResolver $userTimezoneResolver,
        private readonly string $internalTimezone,
    ) {
    }

    public function parseDate(?string $value): ?string
    {
        return $this->parse($value, false);
    }

    public function parseDateTime(?string $value): ?string
    {
        return $this->parse($value, true);
    }

    public function parseDateTimeObject(?string $value): ?DateTimeImmutable
    {
        $value = $this->normalizeValue($value);
        if (null === $value) {
            return null;
        }

        $userTimezone = new DateTimeZone($this->userTimezoneResolver->resolveCurrentUserTimezone());
        $internalTimezone = new DateTimeZone($this->internalTimezone);
        $parsed = $this->parseInternal($value, $userTimezone);

        return $parsed->setTimezone($internalTimezone);
    }

    public function isValidDate(?string $value): bool
    {
        try {
            $this->parseDate($value);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    public function isValidDateTime(?string $value): bool
    {
        try {
            $this->parseDateTime($value);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function parse(?string $value, bool $preserveTime): ?string
    {
        $value = $this->normalizeValue($value);
        if (null === $value) {
            return null;
        }

        $timezone = new DateTimeZone($this->userTimezoneResolver->resolveCurrentUserTimezone());
        $parsed = $this->parseInternal($value, $timezone);

        return $parsed->setTimezone($timezone)->format($preserveTime ? 'Y-m-d H:i:s' : 'Y-m-d');
    }

    private function normalizeValue(?string $value): ?string
    {
        if (null === $value) {
            return null;
        }

        $value = trim($value);

        return '' === $value ? null : $value;
    }

    private function parseInternal(string $value, DateTimeZone $timezone): DateTimeImmutable
    {
        if (ctype_digit($value)) {
            $timestamp = (int) $value;

            if (13 === strlen($value)) {
                $timestamp = (int) floor($timestamp / 1000);
            }

            return (new DateTimeImmutable('@'.$timestamp))->setTimezone($timezone);
        }

        foreach ($this->formatsWithoutTimezone() as $format) {
            $date = $this->createFromFormat($format, $value, $timezone);
            if ($date instanceof DateTimeImmutable) {
                return $date;
            }
        }

        foreach ($this->formatsWithTimezone() as $format) {
            $date = $this->createFromFormat($format, $value);
            if ($date instanceof DateTimeImmutable) {
                return $date;
            }
        }

        try {
            return new DateTimeImmutable($value, $timezone);
        } catch (\Throwable) {
            throw new \InvalidArgumentException('Invalid date input.');
        }
    }

    private function createFromFormat(string $format, string $value, ?DateTimeZone $timezone = null): ?DateTimeImmutable
    {
        $date = DateTimeImmutable::createFromFormat('!'.$format, $value, $timezone);
        if (!$date instanceof DateTimeImmutable) {
            return null;
        }

        $errors = DateTimeImmutable::getLastErrors();
        if (false !== $errors && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) {
            return null;
        }

        return $date;
    }

    /**
     * @return string[]
     */
    private function formatsWithoutTimezone(): array
    {
        return [
            'Y-m-d',
            'Y-m-d H:i:s',
            'Y-m-d\TH:i:s',
            'Y-m-d\TH:i:s.u',
            'd/m/Y',
        ];
    }

    /**
     * @return string[]
     */
    private function formatsWithTimezone(): array
    {
        return [
            DATE_ATOM,
            DateTimeInterface::RFC3339,
            DateTimeInterface::RFC3339_EXTENDED,
            'Y-m-d\TH:i:sP',
            'Y-m-d\TH:i:s.uP',
            'Y-m-d\TH:i:s\Z',
            'Y-m-d\TH:i:s.u\Z',
        ];
    }
}
