<?php

declare(strict_types=1);

namespace App\Tests\Utility\TimeLog;

use App\Utility\TimeLog\TimeLogRange;
use PHPUnit\Framework\TestCase;

class TimeLogRangeTest extends TestCase
{
    public function testOverlapsForOpenLogInsideRange(): void
    {
        self::assertTrue(
            TimeLogRange::overlaps(
                new \DateTime('2026-05-30 00:00:00'),
                new \DateTime('2026-05-30 23:59:59'),
                new \DateTime('2026-05-30 10:00:00'),
                null,
            )
        );
    }

    public function testOverlapsForLogFullyInsideRange(): void
    {
        self::assertTrue(
            TimeLogRange::overlaps(
                new \DateTime('2026-05-30 00:00:00'),
                new \DateTime('2026-05-30 23:59:59'),
                new \DateTime('2026-05-30 10:00:00'),
                new \DateTime('2026-05-30 11:00:00'),
            )
        );
    }

    public function testOverlapsForLogSpanningWholeRange(): void
    {
        self::assertTrue(
            TimeLogRange::overlaps(
                new \DateTime('2026-05-30 00:00:00'),
                new \DateTime('2026-05-30 23:59:59'),
                new \DateTime('2026-05-29 00:00:00'),
                new \DateTime('2026-05-31 00:00:00'),
            )
        );
    }

    public function testDoesNotOverlapForLogOutsideRange(): void
    {
        self::assertFalse(
            TimeLogRange::overlaps(
                new \DateTime('2026-05-30 00:00:00'),
                new \DateTime('2026-05-30 23:59:59'),
                new \DateTime('2026-05-29 00:00:00'),
                new \DateTime('2026-05-29 12:00:00'),
            )
        );
    }
}
