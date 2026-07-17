<?php

declare(strict_types=1);

namespace App\Tests\Service\Task;

use App\Entity\Tag\Tag;
use App\Entity\Task\Task;
use App\Repository\Tag\TagRepository;
use App\Repository\Task\TaskRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\Tag\TagService;
use App\Service\Task\TaskService;
use App\Service\Task\Write\TaskWriteStatus;
use Doctrine\DBAL\Driver\Exception as DriverException;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class TaskServiceWriteTest extends TestCase
{
    public function testCreateReturnsCreatedOutcome(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('persist');
        $entityManager->expects(self::once())->method('flush');
        $repository = $this->repositoryWithEntityManager($entityManager);

        $result = $this->service($repository)->create(name: 'Task', description: 'Description', tagIds: null);

        self::assertSame(TaskWriteStatus::Created, $result->status);
        self::assertInstanceOf(Task::class, $result->task);
    }

    public function testCreateReturnsDuplicateOutcome(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->method('persist')->willThrowException($this->uniqueConstraintViolation());
        $repository = $this->repositoryWithEntityManager($entityManager);

        $result = $this->service($repository)->create(name: 'Task', description: null, tagIds: null);

        self::assertSame(TaskWriteStatus::Duplicate, $result->status);
        self::assertNull($result->task);
    }

    public function testCreateReturnsFailedOutcome(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->method('flush')->willThrowException(new \RuntimeException('db down'));
        $repository = $this->repositoryWithEntityManager($entityManager);

        $result = $this->service($repository)->create(name: 'Task', description: null, tagIds: null);

        self::assertSame(TaskWriteStatus::Failed, $result->status);
    }

    public function testUpdateReturnsUpdatedOutcome(): void
    {
        $task = (new Task())->setName('Old');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('flush');
        $repository = $this->repositoryWithEntityManager($entityManager, $task);

        $result = $this->service($repository)->update('task-id', name: 'New', description: null, tagIds: null);

        self::assertSame(TaskWriteStatus::Updated, $result->status);
        self::assertSame($task, $result->task);
        self::assertSame('New', $task->getName());
    }

    public function testUpdateClearsExistingTagsWhenRequestContainsEmptyTagArray(): void
    {
        $existingTag = (new Tag())->setName('A');
        $task = (new Task())->setName('Task');
        $task->addTag($existingTag);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $repository = $this->repositoryWithEntityManager($entityManager, $task);
        $tagRepository = $this->createMock(TagRepository::class);
        $tagRepository->expects(self::never())->method('findBy');

        $result = $this->service($repository, new TagService($tagRepository))->update(
            'task-id',
            name: null,
            description: null,
            tagIds: [],
        );

        self::assertSame(TaskWriteStatus::Updated, $result->status);
        self::assertCount(0, $task->getTags());
    }

    public function testCreateAppliesResolvedTags(): void
    {
        $tag = (new Tag())->setName('A');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $repository = $this->repositoryWithEntityManager($entityManager);
        $tagRepository = $this->createMock(TagRepository::class);
        $tagRepository->expects(self::once())->method('findBy')->with(['id' => ['tag-id']])->willReturn([$tag]);

        $result = $this->service($repository, new TagService($tagRepository))->create(
            name: 'Task',
            description: null,
            tagIds: ['tag-id'],
        );

        self::assertSame(TaskWriteStatus::Created, $result->status);
        self::assertCount(1, $result->task?->getTags());
    }

    public function testUpdateReturnsNotFoundOutcome(): void
    {
        $repository = $this->repositoryWithEntityManager($this->createMock(EntityManagerInterface::class), null);

        $result = $this->service($repository)->update('missing', name: 'Task', description: null, tagIds: null);

        self::assertSame(TaskWriteStatus::NotFound, $result->status);
    }

    public function testRemoveReturnsDeletedOutcome(): void
    {
        $task = (new Task())->setName('Task');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('remove')->with($task);
        $entityManager->expects(self::once())->method('flush');
        $repository = $this->repositoryWithEntityManager($entityManager, $task);

        $result = $this->service($repository)->remove('task-id');

        self::assertSame(TaskWriteStatus::Deleted, $result->status);
    }

    public function testRemoveReturnsFailedOutcome(): void
    {
        $task = (new Task())->setName('Task');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->method('remove')->willThrowException(new \RuntimeException('db down'));
        $repository = $this->repositoryWithEntityManager($entityManager, $task);

        $result = $this->service($repository)->remove('task-id');

        self::assertSame(TaskWriteStatus::Failed, $result->status);
    }

    private function service(TaskRepository $repository, ?TagService $tagService = null): TaskService
    {
        return new TaskService(
            $repository,
            $this->createMock(TaskFilterDateRangeResolver::class),
            $tagService ?? new TagService($this->createMock(TagRepository::class)),
        );
    }

    private function repositoryWithEntityManager(
        EntityManagerInterface $entityManager,
        ?Task $foundTask = null,
    ): TaskRepository {
        $repository = $this->getMockBuilder(TaskRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getEntityManager', 'find'])
            ->getMock();
        $repository->method('getEntityManager')->willReturn($entityManager);
        $repository->method('find')->willReturn($foundTask);

        return $repository;
    }

    private function uniqueConstraintViolation(): UniqueConstraintViolationException
    {
        return new UniqueConstraintViolationException(
            new class('duplicate') extends \Exception implements DriverException {
                public function getSQLState(): ?string
                {
                    return '23000';
                }
            },
            null
        );
    }
}
