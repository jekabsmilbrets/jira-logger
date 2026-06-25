<?php

declare(strict_types=1);

namespace App\Tests\Repository\Setting;

use App\Entity\Setting\Setting;
use App\Repository\Setting\SettingRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class SettingRepositoryTest extends TestCase
{
    public function testSaveDelegatesToPersistAndFlushWhenRequested(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('persist');
        $entityManager->expects(self::once())->method('flush');

        $repository = $this->getMockBuilder(SettingRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getEntityManager'])
            ->getMock();
        $repository->method('getEntityManager')->willReturn($entityManager);

        $repository->save(new Setting(), true);
    }
}
