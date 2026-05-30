<?php

declare(strict_types=1);

namespace App\Tests\Dto\Task;

use App\Dto\Task\TaskListFilterRequest;
use PHPUnit\Framework\TestCase;

class TaskListFilterRequestTest extends TestCase
{
    public function testHideUnreportedSupportsBooleanStringTrue(): void
    {
        $request = new TaskListFilterRequest();
        $request->setHideUnreported('true');

        self::assertTrue($request->getHideUnreported());
    }

    public function testHideUnreportedSupportsBooleanStringFalse(): void
    {
        $request = new TaskListFilterRequest();
        $request->setHideUnreported('false');

        self::assertFalse($request->getHideUnreported());
    }
}
