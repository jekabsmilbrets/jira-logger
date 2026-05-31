<?php

declare(strict_types=1);

namespace App\Tests\Utility\Constants;

use App\Utility\Constants\Group;
use PHPUnit\Framework\TestCase;

class GroupTest extends TestCase
{
    public function testGroupConstantsAreStable(): void
    {
        self::assertSame('list', Group::LIST);
        self::assertSame('deep', Group::DEEP);
    }
}
