<?php

declare(strict_types=1);

namespace App\Tests\Service\Tag;

use App\Dto\Tag\TagRequest;
use App\Entity\Tag\Tag;
use App\Entity\Task\Task;
use App\Repository\Tag\TagRepository;
use App\Service\Tag\TagService;
use DomainException;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class TagServiceTest extends TestCase
{
    public function testListReturnsNullWhenRepositoryIsEmpty(): void
    {
        $repository = $this->createMock(TagRepository::class);
        $repository->method('findAll')->willReturn([]);

        $service = new TagService($repository);

        self::assertNull($service->list());
    }

    public function testListReturnsCollectionWhenTagsExist(): void
    {
        $repository = $this->createMock(TagRepository::class);
        $repository->method('findAll')->willReturn([(new Tag())->setName('A')]);

        $service = new TagService($repository);

        self::assertCount(1, $service->list());
    }

    public function testNewThrowsWhenNoInputProvided(): void
    {
        $service = new TagService($this->createMock(TagRepository::class));

        $this->expectException(\RuntimeException::class);
        $service->new();
    }

    public function testNewMapsRequestToTag(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('persist');
        $repository = $this->getMockBuilder(TagRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getEntityManager'])
            ->getMock();
        $repository->method('getEntityManager')->willReturn($entityManager);

        $tag = (new TagService($repository))->new((new TagRequest())->setName('new-tag'), flush: false);

        self::assertSame('new-tag', $tag->getName());
    }

    public function testEditMapsRequestToExistingTag(): void
    {
        $tag = (new Tag())->setName('old');
        $repository = $this->createMock(TagRepository::class);
        $repository->method('find')->with('tag-id')->willReturn($tag);

        $result = (new TagService($repository))->edit(
            'tag-id',
            (new TagRequest())->setName('edited'),
            flush: false,
        );

        self::assertSame($tag, $result);
        self::assertSame('edited', $result?->getName());
    }

    public function testDeleteReturnsFalseWhenTagNotFound(): void
    {
        $repository = $this->createMock(TagRepository::class);
        $repository->method('find')->willReturn(null);
        $service = new TagService($repository);

        self::assertFalse($service->delete('missing-id'));
    }

    public function testDeleteThrowsWhenTagIsUsed(): void
    {
        $tag = new Tag();
        $tag->addTask(new Task());
        $repository = $this->createMock(TagRepository::class);
        $repository->method('find')->willReturn($tag);
        $service = new TagService($repository);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage(TagService::TAG_IN_USE);

        $service->delete('used-tag');
    }

    public function testEditReturnsNullWhenTagDoesNotExist(): void
    {
        $repository = $this->createMock(TagRepository::class);
        $repository->method('find')->willReturn(null);
        $service = new TagService($repository);

        $request = (new TagRequest())->setName('edited');

        self::assertNull($service->edit('missing-id', $request));
    }

    public function testShowReturnsTagWhenFound(): void
    {
        $tag = (new Tag())->setName('CAPEX');
        $repository = $this->createMock(TagRepository::class);
        $repository->method('find')->willReturn($tag);

        $service = new TagService($repository);

        self::assertSame($tag, $service->show('id'));
    }
}
