<?php

declare(strict_types=1);

namespace App\Tests\Repository\Tag;

use App\Entity\Tag\Tag;
use App\Repository\Tag\TagRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class TagRepositoryTest extends TestCase
{
    public function testSavePersistsAndOptionallyFlushes(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('persist');
        $entityManager->expects(self::once())->method('flush');

        $repository = $this->getMockBuilder(TagRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getEntityManager'])
            ->getMock();
        $repository->method('getEntityManager')->willReturn($entityManager);

        $repository->save(new Tag(), true);
    }

    public function testRemoveCallsEntityManagerRemove(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('remove');

        $repository = $this->getMockBuilder(TagRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getEntityManager'])
            ->getMock();
        $repository->method('getEntityManager')->willReturn($entityManager);

        $repository->remove(new Tag(), false);
    }
}
