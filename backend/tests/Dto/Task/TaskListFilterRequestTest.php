<?php

declare(strict_types=1);

namespace App\Tests\Dto\Task;

use App\Dto\Task\TaskListFilterRequest;
use PHPUnit\Framework\TestCase;

class TaskListFilterRequestTest extends TestCase
{
    private function createRequest(): TaskListFilterRequest
    {
        return new TaskListFilterRequest();
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

    public function testDateStoresUnixTimestampMilliseconds(): void
    {
        $request = $this->createRequest();
        $request->setDate('1735689600000');

        self::assertSame('1735689600000', $request->getDate());
    }

    public function testStartDateStoresIsoDateTime(): void
    {
        $request = $this->createRequest();
        $request->setStartDate('2026-05-31T14:30:45Z');

        self::assertSame('2026-05-31T14:30:45Z', $request->getStartDate());
    }

    public function testEndDateStoresEuSlashDate(): void
    {
        $request = $this->createRequest();
        $request->setEndDate('31/05/2026');

        self::assertSame('31/05/2026', $request->getEndDate());
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
