<?php

declare(strict_types=1);

namespace App\Tests\Service\Tag;

use App\Dto\Tag\TagRequest;
use App\Entity\Tag\Tag;
use App\Repository\Tag\TagRepository;
use App\Service\Tag\TagService;
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

    public function testDeleteReturnsFalseWhenTagNotFound(): void
    {
        $repository = $this->createMock(TagRepository::class);
        $repository->method('find')->willReturn(null);
        $service = new TagService($repository);

        self::assertFalse($service->delete('missing-id'));
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
