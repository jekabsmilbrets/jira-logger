<?php

declare(strict_types=1);

namespace App\Tests\Repository\JiraWorkLog;

use App\Entity\JiraWorkLog\JiraWorkLog;
use App\Repository\JiraWorkLog\JiraWorkLogRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class JiraWorkLogRepositoryTest extends TestCase
{
    public function testFlushCallsEntityManagerFlush(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('flush');

        $repository = $this->getMockBuilder(JiraWorkLogRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getEntityManager'])
            ->getMock();
        $repository->method('getEntityManager')->willReturn($entityManager);

        $repository->flush();
    }

    public function testRemoveCanFlush(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('remove');
        $entityManager->expects(self::once())->method('flush');

        $repository = $this->getMockBuilder(JiraWorkLogRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getEntityManager'])
            ->getMock();
        $repository->method('getEntityManager')->willReturn($entityManager);

        $repository->remove(new JiraWorkLog(), true);
    }
}
