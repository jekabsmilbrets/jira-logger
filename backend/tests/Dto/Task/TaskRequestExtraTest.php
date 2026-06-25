<?php

declare(strict_types=1);

namespace App\Tests\Dto\Task;

use App\Dto\Task\TaskRequest;
use PHPUnit\Framework\TestCase;

class TaskRequestExtraTest extends TestCase
{
    public function testSetTagsStoresRawTagIds(): void
    {
        $request = new TaskRequest();
        $request->setTags(['22222222-2222-2222-2222-222222222222']);

        self::assertSame(['22222222-2222-2222-2222-222222222222'], $request->getTagIds());
    }

    public function testSetTagsPreservesEmptyArrayAsClearTagsIntent(): void
    {
        $request = new TaskRequest();
        $request->setTags([]);

        self::assertSame([], $request->getTagIds());
    }
}
