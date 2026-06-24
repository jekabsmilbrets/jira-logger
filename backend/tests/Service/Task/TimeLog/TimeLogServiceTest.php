<?php

declare(strict_types=1);

namespace App\Tests\Service\Task\TimeLog;

use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Repository\Task\TaskRepository;
use App\Repository\Task\TimeLog\TimeLogRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\Task\Filter\TaskFilterCriteriaFactory;
use App\Service\Task\JiraSync\TaskJiraSyncAdapter;
use App\Service\Task\TaskService;
use App\Service\Task\TimeLog\TimeLogService;
use App\Service\Task\TimeLog\TimeLogWriteStatus;
use PHPUnit\Framework\TestCase;

class TimeLogServiceTest extends TestCase
{
    private function assignEntityId(object $entity, string $id): void
    {
        $reflectionProperty = new \ReflectionProperty($entity, 'id');
        $reflectionProperty->setValue($entity, $id);
    }

    private function serviceWithTask(TimeLogRepository $timeLogRepository, ?Task $task): TimeLogService
    {
        $taskRepository = $this->createMock(TaskRepository::class);
        $taskRepository->method('find')->willReturn($task);

        return new TimeLogService(
            $timeLogRepository,
            new TaskService(
                $taskRepository,
                new TaskFilterCriteriaFactory($this->createMock(TaskFilterDateRangeResolver::class)),
                $this->createMock(TaskJiraSyncAdapter::class),
            )
        );
    }

    public function testStartStopsAllRunningTimeLogsGlobally(): void
    {
        $repository = $this->createMock(TimeLogRepository::class);
        $repository->expects(self::once())
            ->method('stopAllRunningTimeLogs')
            ->willReturn(1);
        $repository->expects(self::once())
            ->method('add');

        $task = new Task();
        $service = $this->serviceWithTask($repository, $task);

        $result = $service->start('task-id', false);
        $timeLog = $result->timeLog;

        self::assertSame(TimeLogWriteStatus::Created, $result->status);
        self::assertInstanceOf(TimeLog::class, $timeLog);
        self::assertSame($task, $timeLog->getTask());
        self::assertNull($timeLog->getEndTime());
        self::assertInstanceOf(\DateTimeImmutable::class, $timeLog->getStartTime());
    }

    public function testStartReturnsNotFoundWhenTaskDoesNotExist(): void
    {
        $service = $this->serviceWithTask($this->createMock(TimeLogRepository::class), null);

        self::assertSame(TimeLogWriteStatus::NotFound, $service->start('missing-task')->status);
    }

    public function testStopReturnsFailedWhenTaskHasNoTimeLogs(): void
    {
        $task = new Task();
        $service = $this->serviceWithTask($this->createMock(TimeLogRepository::class), $task);

        self::assertSame(TimeLogWriteStatus::Failed, $service->stop('task-id', false)->status);
    }

    public function testStopReturnsFailedWhenLastTimeLogAlreadyStopped(): void
    {
        $task = new Task();
        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTime('2026-05-30 09:00:00'))
            ->setEndTime(new \DateTime('2026-05-30 10:00:00'));
        $task->addTimeLog($timeLog);
        $service = $this->serviceWithTask($this->createMock(TimeLogRepository::class), $task);

        self::assertSame(TimeLogWriteStatus::Failed, $service->stop('task-id', false)->status);
    }

    public function testStopSetsImmutableEndTimeForOpenLog(): void
    {
        $repository = $this->createMock(TimeLogRepository::class);
        $task = new Task();
        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-05-30 09:00:00'));
        $this->assignEntityId($task, '5640e2d4-eff2-4f53-8e71-8cd305530f7f');
        $this->assignEntityId($timeLog, 'f9d3d0b5-d71b-4758-b762-9b27c6125d20');
        $task->addTimeLog($timeLog);
        $service = $this->serviceWithTask($repository, $task);

        $result = $service->stop('task-id', false);
        $updatedTimeLog = $result->timeLog;

        self::assertSame(TimeLogWriteStatus::Updated, $result->status);
        self::assertSame($timeLog, $updatedTimeLog);
        self::assertInstanceOf(\DateTimeImmutable::class, $updatedTimeLog?->getEndTime());
    }
}
