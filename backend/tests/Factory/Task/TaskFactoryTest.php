<?php

declare(strict_types=1);

namespace App\Tests\Factory\Task;

use App\Dto\Task\TaskRequest;
use App\Entity\Tag\Tag;
use App\Factory\Task\TaskFactory;
use App\Repository\Tag\TagRepository;
use App\Service\Tag\TagService;
use App\Tests\Support\EntityIdSetter;
use PHPUnit\Framework\TestCase;

class TaskFactoryTest extends TestCase
{
    use EntityIdSetter;

    public function testCreateMapsBasicFieldsAndTags(): void
    {
        $requestTag = (new Tag())->setName('A');
        $this->setEntityId($requestTag, '11111111-1111-1111-1111-111111111111');

        $repository = $this->createMock(TagRepository::class);
        $repository->method('findAll')->willReturn([$requestTag]);

        $request = new TaskRequest(new TagService($repository));
        $request->setName('T')->setDescription('Desc');
        $request->setTags(['11111111-1111-1111-1111-111111111111']);

        $task = TaskFactory::create($request);

        self::assertSame('T', $task->getName());
        self::assertSame('Desc', $task->getDescription());
        self::assertCount(1, $task->getTags());
    }
}
