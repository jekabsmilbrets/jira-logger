<?php

declare(strict_types=1);

namespace App\Tests\Dto\Task;

use App\Dto\Task\TaskRequest;
use App\Entity\Tag\Tag;
use App\Repository\Tag\TagRepository;
use App\Service\Tag\TagService;
use App\Tests\Support\EntityIdSetter;
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\TestCase;

class TaskRequestExtraTest extends TestCase
{
    use EntityIdSetter;

    public function testSetTagsMapsIdsToKnownTagsOnly(): void
    {
        $tagA = (new Tag())->setName('A');
        $tagB = (new Tag())->setName('B');
        $this->setEntityId($tagA, '11111111-1111-1111-1111-111111111111');
        $this->setEntityId($tagB, '22222222-2222-2222-2222-222222222222');

        $repository = $this->createMock(TagRepository::class);
        $repository->method('findAll')->willReturn([$tagA, $tagB]);

        $request = new TaskRequest(new TagService($repository));
        $request->setTags(['22222222-2222-2222-2222-222222222222']);

        self::assertCount(1, $request->getTags());
        self::assertSame($tagB, $request->getTags()->first());
    }

    public function testSetTagsIgnoresEmptyArray(): void
    {
        $repository = $this->createMock(TagRepository::class);
        $repository->method('findAll')->willReturn([]);

        $request = new TaskRequest(new TagService($repository));
        $request->setTags([]);

        self::assertNull($request->getTags());
    }
}
