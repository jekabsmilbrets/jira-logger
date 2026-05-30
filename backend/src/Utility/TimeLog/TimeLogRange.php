<?php

declare(strict_types=1);

namespace App\Utility\TimeLog;

final class TimeLogRange
{
    public static function overlaps(
        \DateTimeInterface $rangeStart,
        \DateTimeInterface $rangeEnd,
        ?\DateTimeInterface $logStart,
        ?\DateTimeInterface $logEnd,
    ): bool {
        if (!$logStart) {
            return false;
        }

        return $logStart <= $rangeEnd && (!$logEnd || $logEnd >= $rangeStart);
    }
}
