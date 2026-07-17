<?php

declare(strict_types=1);

namespace App\Tests\Service\JiraWorkLog;

use App\Dto\JiraWorkLog\JiraWorkLogRequest;
use App\Entity\Task\Task;
use App\Repository\JiraWorkLog\JiraWorkLogRepository;
use App\Repository\Task\TaskRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\JiraWorkLog\JiraWorkLogService;
use App\Service\JiraWorkLog\JiraWorkLogWriteStatus;
use App\Service\Tag\TagService;
use App\Service\Task\TaskService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class JiraWorkLogServiceTest extends TestCase
{
    public function testNewFailsWhenTaskDoesNotExist(): void
    {
        $taskRepository = $this->createMock(TaskRepository::class);
        $taskRepository->method('find')->willReturn(null);
        $request = (new JiraWorkLogRequest())
            ->setTask('5640e2d4-eff2-4f53-8e71-8cd305530f7f')
            ->setTimeSpentSeconds(120);

        $service = new JiraWorkLogService(
            $this->createMock(JiraWorkLogRepository::class),
            new TaskService(
                $taskRepository,
                $this->createMock(TaskFilterDateRangeResolver::class),
                $this->createMock(TagService::class),
            )
        );

        self::assertSame(JiraWorkLogWriteStatus::NotFound, $service->new($request, flush: false)->status);
    }

    public function testNewReturnsCreatedWhenTaskExists(): void
    {
        $task = new Task();
        $taskRepository = $this->createMock(TaskRepository::class);
        $taskRepository->method('find')->willReturn($task);
        $request = (new JiraWorkLogRequest())
            ->setTask('5640e2d4-eff2-4f53-8e71-8cd305530f7f')
            ->setDescription('note')
            ->setTimeSpentSeconds(120);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('persist');
        $repository = $this->getMockBuilder(JiraWorkLogRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getEntityManager'])
            ->getMock();
        $repository->method('getEntityManager')->willReturn($entityManager);

        $service = new JiraWorkLogService(
            $repository,
            new TaskService(
                $taskRepository,
                $this->createMock(TaskFilterDateRangeResolver::class),
                $this->createMock(TagService::class),
            )
        );

        $result = $service->new($request, flush: false);

        self::assertSame(JiraWorkLogWriteStatus::Created, $result->status);
        self::assertNotNull($result->jiraWorkLog);
        self::assertSame('note', $result->jiraWorkLog->getDescription());
        self::assertSame(120, $result->jiraWorkLog->getTimeSpentSeconds());
        self::assertSame($task, $result->jiraWorkLog->getTask());
    }
}
