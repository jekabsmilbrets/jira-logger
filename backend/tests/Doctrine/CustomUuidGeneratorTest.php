<?php

declare(strict_types=1);

namespace App\Tests\Doctrine;

use App\Doctrine\CustomUuidGenerator;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Ramsey\Uuid\Uuid;

class CustomUuidGeneratorTest extends TestCase
{
    public function testGenerateIdReturnsValidUuidV4String(): void
    {
        $generator = new CustomUuidGenerator();
        $entityManager = $this->createMock(EntityManagerInterface::class);

        $id = $generator->generateId($entityManager, new \stdClass());

        self::assertTrue(Uuid::isValid($id));
    }
}
