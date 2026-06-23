<?php

declare(strict_types=1);

namespace App\Tests\Service\Task\Input;

use App\Dto\Task\TaskRequest;
use App\Entity\Tag\Tag;
use App\Repository\Tag\TagRepository;
use App\Service\Tag\TagService;
use App\Service\Task\Input\TaskInputFactory;
use App\Tests\Support\EntityIdSetter;
use PHPUnit\Framework\TestCase;

class TaskInputFactoryTest extends TestCase
{
    use EntityIdSetter;

    public function testCreateResolvesKnownTagIdsOnly(): void
    {
        $tagA = (new Tag())->setName('A');
        $tagB = (new Tag())->setName('B');
        $this->setEntityId($tagA, '11111111-1111-1111-1111-111111111111');
        $this->setEntityId($tagB, '22222222-2222-2222-2222-222222222222');

        $repository = $this->createMock(TagRepository::class);
        $repository
            ->expects(self::once())
            ->method('findBy')
            ->with(['id' => ['22222222-2222-2222-2222-222222222222', 'missing']])
            ->willReturn([$tagB]);

        $request = (new TaskRequest())
            ->setName('Task')
            ->setDescription('Description')
            ->setTags(['22222222-2222-2222-2222-222222222222', 'missing']);

        $input = (new TaskInputFactory(new TagService($repository)))->create($request);

        self::assertSame('Task', $input->name);
        self::assertSame('Description', $input->description);
        self::assertNotNull($input->tags);
        self::assertCount(1, $input->tags);
        self::assertSame($tagB, $input->tags->first());
    }

    public function testCreatePreservesEmptyTagArrayAsClearTagsIntent(): void
    {
        $repository = $this->createMock(TagRepository::class);
        $repository->expects(self::never())->method('findBy');

        $input = (new TaskInputFactory(new TagService($repository)))->create(
            (new TaskRequest())->setTags([])
        );

        self::assertNotNull($input->tags);
        self::assertCount(0, $input->tags);
    }
}
