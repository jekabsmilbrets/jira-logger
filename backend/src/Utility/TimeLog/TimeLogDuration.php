<?php

declare(strict_types=1);

namespace App\Utility\TimeLog;

final class TimeLogDuration
{
    public static function secondsBetween(
        ?\DateTimeInterface $startTime,
        ?\DateTimeInterface $endTime,
    ): int {
        if (!$startTime || !$endTime) {
            return 0;
        }

        $seconds = $endTime->getTimestamp() - $startTime->getTimestamp();

        return max(0, $seconds);
    }

    public static function clippedSecondsInRange(
        \DateTimeInterface $rangeStart,
        \DateTimeInterface $rangeEnd,
        ?\DateTimeInterface $logStart,
        ?\DateTimeInterface $logEnd,
    ): int {
        if (!$logStart) {
            return 0;
        }

        $effectiveStart = $logStart < $rangeStart ? $rangeStart : $logStart;
        $effectiveEndSource = $logEnd ?? $rangeEnd;
        $effectiveEnd = $effectiveEndSource > $rangeEnd ? $rangeEnd : $effectiveEndSource;

        return self::secondsBetween($effectiveStart, $effectiveEnd);
    }
}
