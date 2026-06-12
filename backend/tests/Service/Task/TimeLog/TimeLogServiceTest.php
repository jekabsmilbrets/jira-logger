<?php

declare(strict_types=1);

namespace App\Tests\Service\Task\TimeLog;

use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Repository\Task\TimeLog\TimeLogRepository;
use App\Service\Task\TimeLog\TimeLogService;
use PHPUnit\Framework\TestCase;

class TimeLogServiceTest extends TestCase
{
    private function assignEntityId(object $entity, string $id): void
    {
        $reflectionProperty = new \ReflectionProperty($entity, 'id');
        $reflectionProperty->setValue($entity, $id);
    }

    public function testStartTaskTimeLogStopsAllRunningTimeLogsGlobally(): void
    {
        $repository = $this->createMock(TimeLogRepository::class);
        $repository->expects(self::once())
            ->method('stopAllRunningTimeLogs')
            ->willReturn(1);
        $repository->expects(self::once())
            ->method('add');

        $service = new TimeLogService($repository);
        $task = new Task();

        $timeLog = $service->startTaskTimeLog($task, false);

        self::assertInstanceOf(TimeLog::class, $timeLog);
        self::assertSame($task, $timeLog->getTask());
        self::assertNull($timeLog->getEndTime());
        self::assertInstanceOf(\DateTimeImmutable::class, $timeLog->getStartTime());
    }

    public function testStopTaskTimeLogReturnsNullWhenTaskHasNoTimeLogs(): void
    {
        $service = new TimeLogService($this->createMock(TimeLogRepository::class));
        $task = new Task();

        self::assertNull($service->stopTaskTimeLog($task, false));
    }

    public function testStopTaskTimeLogReturnsNullWhenLastTimeLogAlreadyStopped(): void
    {
        $service = new TimeLogService($this->createMock(TimeLogRepository::class));
        $task = new Task();
        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTime('2026-05-30 09:00:00'))
            ->setEndTime(new \DateTime('2026-05-30 10:00:00'));
        $task->addTimeLog($timeLog);

        self::assertNull($service->stopTaskTimeLog($task, false));
    }

    public function testStopTaskTimeLogSetsImmutableEndTimeForOpenLog(): void
    {
        $repository = $this->createMock(TimeLogRepository::class);
        $service = new TimeLogService($repository);
        $task = new Task();
        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-05-30 09:00:00'));
        $this->assignEntityId($task, '5640e2d4-eff2-4f53-8e71-8cd305530f7f');
        $this->assignEntityId($timeLog, 'f9d3d0b5-d71b-4758-b762-9b27c6125d20');
        $task->addTimeLog($timeLog);

        $updatedTimeLog = $service->stopTaskTimeLog($task, false);

        self::assertSame($timeLog, $updatedTimeLog);
        self::assertInstanceOf(\DateTimeImmutable::class, $updatedTimeLog?->getEndTime());
    }
}
