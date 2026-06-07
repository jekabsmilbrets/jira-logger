<?php

declare(strict_types=1);

namespace App\Tests\Entity\Task\TimeLog;

use App\Entity\Task\TimeLog\TimeLog;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class TimeLogDoctrineMetadataTest extends KernelTestCase
{
    public function testTimeLogUsesImmutableDateTimeMappings(): void
    {
        self::bootKernel();

        /** @var EntityManagerInterface $entityManager */
        $entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $metadata = $entityManager->getClassMetadata(TimeLog::class);
        $startTimeMapping = $metadata->getFieldMapping('startTime');
        $endTimeMapping = $metadata->getFieldMapping('endTime');

        self::assertSame(Types::DATETIME_IMMUTABLE, is_array($startTimeMapping) ? $startTimeMapping['type'] : $startTimeMapping->type);
        self::assertSame(Types::DATETIME_IMMUTABLE, is_array($endTimeMapping) ? $endTimeMapping['type'] : $endTimeMapping->type);
    }
}
