<?php

declare(strict_types=1);

namespace App\Tests\Doctrine;

use App\Doctrine\CustomUuidGenerator;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Ramsey\Uuid\UuidInterface;

class CustomUuidGeneratorTest extends TestCase
{
    public function testGenerateIdReturnsValidUuidV4(): void
    {
        $generator = new CustomUuidGenerator();
        $entityManager = $this->createMock(EntityManagerInterface::class);

        $id = $generator->generateId($entityManager, new \stdClass());

        self::assertInstanceOf(UuidInterface::class, $id);
        self::assertSame(4, $id->getFields()->getVersion());
    }
}
