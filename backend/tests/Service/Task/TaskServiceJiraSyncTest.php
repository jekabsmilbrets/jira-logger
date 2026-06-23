<?php

declare(strict_types=1);

namespace App\Tests\Service\Task;

use App\Entity\Task\Task;
use App\Exception\JiraApiServiceException;
use App\Repository\Task\TaskRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\Tag\TagService;
use App\Service\Task\Filter\TaskFilterCriteriaFactory;
use App\Service\Task\Input\TaskInputFactory;
use App\Service\Task\JiraSync\TaskJiraSyncAdapter;
use App\Service\Task\Sync\TaskSyncStatus;
use App\Service\Task\TaskService;
use PHPUnit\Framework\TestCase;

class TaskServiceJiraSyncTest extends TestCase
{
    public function testSyncWithJiraReturnsNotFoundWhenTaskMissing(): void
    {
        $repository = $this->createMock(TaskRepository::class);
        $repository->method('find')->with('missing')->willReturn(null);
        $adapter = $this->createMock(TaskJiraSyncAdapter::class);
        $adapter->expects(self::never())->method('syncTask');

        $result = $this->service($repository, $adapter)->syncWithJira('missing', '2026-06-23');

        self::assertSame(TaskSyncStatus::NotFound, $result->status);
    }

    public function testSyncWithJiraDelegatesToAdapter(): void
    {
        $task = (new Task())->setName('TASK');
        $repository = $this->createMock(TaskRepository::class);
        $repository->method('find')->with('task-id')->willReturn($task);
        $adapter = $this->createMock(TaskJiraSyncAdapter::class);
        $adapter
            ->expects(self::once())
            ->method('syncTask')
            ->with($task, '2026-06-23')
            ->willReturn(true);

        $result = $this->service($repository, $adapter)->syncWithJira('task-id', '2026-06-23');

        self::assertSame(TaskSyncStatus::Synced, $result->status);
    }

    public function testSyncWithJiraPreservesConflictResult(): void
    {
        $task = (new Task())->setName('TASK');
        $repository = $this->createMock(TaskRepository::class);
        $repository->method('find')->willReturn($task);
        $adapter = $this->createMock(TaskJiraSyncAdapter::class);
        $adapter->method('syncTask')->willReturn(false);

        $result = $this->service($repository, $adapter)->syncWithJira('task-id', '2026-06-23');

        self::assertSame(TaskSyncStatus::Conflict, $result->status);
    }

    public function testSyncWithJiraReturnsFailedOutcomeForAdapterFailures(): void
    {
        $task = (new Task())->setName('TASK');
        $repository = $this->createMock(TaskRepository::class);
        $repository->method('find')->willReturn($task);
        $adapter = $this->createMock(TaskJiraSyncAdapter::class);
        $adapter->method('syncTask')->willThrowException(new JiraApiServiceException('jira failed'));

        $result = $this->service($repository, $adapter)->syncWithJira('task-id', '2026-06-23');

        self::assertSame(TaskSyncStatus::Failed, $result->status);
        self::assertSame('jira failed', $result->errorMessage);
    }

    private function service(TaskRepository $repository, TaskJiraSyncAdapter $adapter): TaskService
    {
        return new TaskService(
            $repository,
            new TaskFilterCriteriaFactory($this->createMock(TaskFilterDateRangeResolver::class)),
            $adapter,
            new TaskInputFactory($this->createMock(TagService::class))
        );
    }
}
