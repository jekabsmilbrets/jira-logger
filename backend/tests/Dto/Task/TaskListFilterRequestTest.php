<?php

declare(strict_types=1);

namespace App\Tests\Dto\Task;

use App\Dto\Task\TaskListFilterRequest;
use App\Service\DateTime\DateInputParser;
use App\Service\DateTime\UserTimezoneResolver;
use PHPUnit\Framework\TestCase;

class TaskListFilterRequestTest extends TestCase
{
    private function createRequest(): TaskListFilterRequest
    {
        $timezoneResolver = $this->createMock(UserTimezoneResolver::class);
        $timezoneResolver
            ->method('resolveCurrentUserTimezone')
            ->willReturn('Europe/Riga');

        return new TaskListFilterRequest(
            new DateInputParser($timezoneResolver, 'UTC')
        );
    }

    public function testHideUnreportedSupportsBooleanStringTrue(): void
    {
        $request = $this->createRequest();
        $request->setHideUnreported('true');

        self::assertTrue($request->getHideUnreported());
    }

    public function testHideUnreportedSupportsBooleanStringFalse(): void
    {
        $request = $this->createRequest();
        $request->setHideUnreported('false');

        self::assertFalse($request->getHideUnreported());
    }

    public function testDateSupportsUnixTimestampMilliseconds(): void
    {
        $request = $this->createRequest();
        $request->setDate('1735689600000');

        self::assertSame('2025-01-01', $request->getDate());
    }

    public function testStartDateSupportsIsoDateTime(): void
    {
        $request = $this->createRequest();
        $request->setStartDate('2026-05-31T14:30:45Z');

        self::assertSame('2026-05-31 17:30:45', $request->getStartDate());
    }

    public function testEndDateSupportsEuSlashDate(): void
    {
        $request = $this->createRequest();
        $request->setEndDate('31/05/2026');

        self::assertSame('2026-05-31', $request->getEndDate());
    }

    public function testRangeDateOnlyInputsStayDateOnly(): void
    {
        $request = $this->createRequest();
        $request->setStartDate('2026-06-05');
        $request->setEndDate('2026-06-06');

        self::assertSame('2026-06-05', $request->getStartDate());
        self::assertSame('2026-06-06', $request->getEndDate());
    }
}
