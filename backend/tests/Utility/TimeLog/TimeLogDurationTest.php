<?php

declare(strict_types=1);

namespace App\Tests\Utility\TimeLog;

use App\Utility\TimeLog\TimeLogDuration;
use PHPUnit\Framework\TestCase;

class TimeLogDurationTest extends TestCase
{
    public function testClippedSecondsForOpenLogUsesRangeEnd(): void
    {
        $seconds = TimeLogDuration::clippedSecondsInRange(
            new \DateTimeImmutable('2026-05-30 00:00:00'),
            new \DateTimeImmutable('2026-05-30 23:59:59'),
            new \DateTimeImmutable('2026-05-30 12:00:00'),
            null,
        );

        self::assertSame(43199, $seconds);
    }

    public function testClippedSecondsForLogSpanningWholeRange(): void
    {
        $seconds = TimeLogDuration::clippedSecondsInRange(
            new \DateTimeImmutable('2026-05-30 00:00:00'),
            new \DateTimeImmutable('2026-05-30 23:59:59'),
            new \DateTimeImmutable('2026-05-29 10:00:00'),
            new \DateTimeImmutable('2026-05-31 10:00:00'),
        );

        self::assertSame(86399, $seconds);
    }

    public function testSecondsBetweenHandlesDstForwardBoundary(): void
    {
        $tz = new \DateTimeZone('Europe/Riga');
        $start = new \DateTimeImmutable('2026-03-29 01:30:00', $tz);
        $end = new \DateTimeImmutable('2026-03-29 04:30:00', $tz);

        self::assertSame(7200, TimeLogDuration::secondsBetween($start, $end));
    }

    public function testSecondsBetweenHandlesDstBackwardBoundary(): void
    {
        $tz = new \DateTimeZone('Europe/Riga');
        $start = new \DateTimeImmutable('2026-10-25 01:30:00', $tz);
        $end = new \DateTimeImmutable('2026-10-25 04:30:00', $tz);

        self::assertSame(14400, TimeLogDuration::secondsBetween($start, $end));
    }
}
