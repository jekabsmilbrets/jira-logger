<?php

declare(strict_types=1);

namespace App\Tests\Dto\Task\TimeLog;

use App\Dto\Task\TimeLog\TimeLogRequest;
use App\Service\DateTime\DateInputParser;
use App\Service\DateTime\UserTimezoneResolver;
use App\Service\Task\TaskService;
use PHPUnit\Framework\TestCase;

class TimeLogRequestTest extends TestCase
{
    private function createRequest(): TimeLogRequest
    {
        $taskService = $this->createMock(TaskService::class);
        $timezoneResolver = $this->createMock(UserTimezoneResolver::class);
        $timezoneResolver
            ->method('resolveCurrentUserTimezone')
            ->willReturn('Europe/Riga');

        return new TimeLogRequest(
            taskService: $taskService,
            dateInputParser: new DateInputParser($timezoneResolver),
        );
    }

    public function testStartTimeNormalizesIsoDateTime(): void
    {
        $request = $this->createRequest();
        $request->setStartTime('2026-05-31T12:00:00Z');

        self::assertSame('2026-05-31 15:00:00', $request->getStartTime());
    }

    public function testEndTimeNormalizesUnixTimestampMilliseconds(): void
    {
        $request = $this->createRequest();
        $request->setEndTime('1735689600000');

        self::assertSame('2025-01-01 02:00:00', $request->getEndTime());
    }

    public function testEndTimeNormalizesUnixTimestampMillisecondsWhenNumeric(): void
    {
        $request = $this->createRequest();
        $request->setEndTime(1735689600000);

        self::assertSame('2025-01-01 02:00:00', $request->getEndTime());
    }
}
