<?php

declare(strict_types=1);

namespace App\Tests\Service\JiraWorkLog;

use App\Dto\JiraWorkLog\JiraWorkLogRequest;
use App\Repository\JiraWorkLog\JiraWorkLogRepository;
use App\Repository\Task\TaskRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\JiraWorkLog\JiraWorkLogService;
use App\Service\Task\Filter\TaskFilterCriteriaFactory;
use App\Service\Task\JiraSync\TaskJiraSyncAdapter;
use App\Service\Task\Projection\TaskListProjection;
use App\Service\Task\TaskService;
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
                new TaskFilterCriteriaFactory($this->createMock(TaskFilterDateRangeResolver::class)),
                $this->createMock(TaskJiraSyncAdapter::class),
                new TaskListProjection(),
            )
        );

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Task not found');

        $service->new($request, flush: false);
    }
}
