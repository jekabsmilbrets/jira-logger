<?php

declare(strict_types=1);

namespace App\Tests\Entity\Tag;

use App\Entity\Tag\Tag;
use App\Entity\Task\Task;
use PHPUnit\Framework\TestCase;

class TagEntityTest extends TestCase
{
    public function testNameGetterSetter(): void
    {
        $tag = (new Tag())->setName('infra');

        self::assertSame('infra', $tag->getName());
    }

    public function testAddAndRemoveTask(): void
    {
        $tag = new Tag();
        $task = new Task();

        $tag->addTask($task);
        self::assertCount(1, $tag->getTasks());

        $tag->removeTask($task);
        self::assertCount(0, $tag->getTasks());
    }

    public function testGetIsUsedReflectsTaskAssignments(): void
    {
        $tag = new Tag();

        self::assertFalse($tag->getIsUsed());

        $tag->addTask(new Task());

        self::assertTrue($tag->getIsUsed());
    }
}
