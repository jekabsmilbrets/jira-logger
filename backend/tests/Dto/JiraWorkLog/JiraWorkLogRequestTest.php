<?php

declare(strict_types=1);

namespace App\Tests\Dto\JiraWorkLog;

use App\Dto\JiraWorkLog\JiraWorkLogRequest;
use PHPUnit\Framework\TestCase;

class JiraWorkLogRequestTest extends TestCase
{
    public function testSetTaskStoresTransportValue(): void
    {
        $request = new JiraWorkLogRequest();

        $request->setTask('5640e2d4-eff2-4f53-8e71-8cd305530f7f');

        self::assertSame('5640e2d4-eff2-4f53-8e71-8cd305530f7f', $request->getTask());
    }

    public function testSetTaskRejectsNonScalarInput(): void
    {
        $request = new JiraWorkLogRequest();

        $request->setTask([]);

        self::assertSame('', $request->getTask());
    }
}
