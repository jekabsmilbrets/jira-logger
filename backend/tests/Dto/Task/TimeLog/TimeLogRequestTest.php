<?php

declare(strict_types=1);

namespace App\Tests\Dto\Task\TimeLog;

use App\Dto\Task\TimeLog\TimeLogRequest;
use PHPUnit\Framework\TestCase;

class TimeLogRequestTest extends TestCase
{
    public function testStartTimeStoresTransportValue(): void
    {
        $request = new TimeLogRequest();
        $request->setStartTime('2026-05-31T12:00:00Z');

        self::assertSame('2026-05-31T12:00:00Z', $request->getStartTime());
    }

    public function testEndTimeStoresUnixTimestampMilliseconds(): void
    {
        $request = new TimeLogRequest();
        $request->setEndTime('1735689600000');

        self::assertSame('1735689600000', $request->getEndTime());
    }

    public function testEndTimeStoresNumericInputAsString(): void
    {
        $request = new TimeLogRequest();
        $request->setEndTime(1735689600000);

        self::assertSame('1735689600000', $request->getEndTime());
    }

    public function testTaskStoresTransportValue(): void
    {
        $request = new TimeLogRequest();
        $request->setTask('5640e2d4-eff2-4f53-8e71-8cd305530f7f');

        self::assertSame('5640e2d4-eff2-4f53-8e71-8cd305530f7f', $request->getTask());
    }
}
