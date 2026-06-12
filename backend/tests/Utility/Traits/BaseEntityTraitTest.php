<?php

declare(strict_types=1);

namespace App\Tests\Utility\Traits;

use App\Utility\Traits\BaseEntityTrait;
use PHPUnit\Framework\TestCase;

class BaseEntityTraitTest extends TestCase
{
    public function testUpdatedTimestampsSetsCreatedAndUpdatedAt(): void
    {
        $entity = new class {
            use BaseEntityTrait;
        };

        $entity->updatedTimestamps();

        self::assertInstanceOf(\DateTimeInterface::class, $entity->getCreatedAt());
        self::assertInstanceOf(\DateTimeInterface::class, $entity->getUpdatedAt());
    }

    public function testUpdatedTimestampsDoesNotOverrideCreatedAtWhenPresent(): void
    {
        $entity = new class {
            use BaseEntityTrait;
        };

        $createdAt = new \DateTimeImmutable('2026-01-01T00:00:00+00:00');
        $entity->setCreatedAt($createdAt);
        $entity->updatedTimestamps();

        self::assertSame($createdAt, $entity->getCreatedAt());
    }
}
