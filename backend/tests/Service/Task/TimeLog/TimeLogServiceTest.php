<?php

declare(strict_types=1);

namespace App\Tests\Service\Task\TimeLog;

use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Repository\Task\TaskRepository;
use App\Repository\Task\TimeLog\TimeLogRepository;
use App\Service\DateTime\DateInputParser;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\DateTime\UserTimezoneResolver;
use App\Service\Task\JiraSync\JiraTaskSyncService;
use App\Service\Task\TaskService;
use App\Service\Task\TimeLog\TimeLogService;
use App\Service\Task\TimeLog\TimeLogWriteStatus;
use Doctrine\ORM\EntityManagerInterface;
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
                $this->createMock(TaskFilterDateRangeResolver::class),
                $this->createMock(JiraTaskSyncService::class),
            ),
            $this->createMock(DateInputParser::class),
            $this->timezoneResolver(),
        );
    }

    private function timezoneResolver(string $timezone = 'Europe/Riga'): UserTimezoneResolver
    {
        $resolver = $this->createMock(UserTimezoneResolver::class);
        $resolver->method('resolveCurrentUserTimezone')->willReturn($timezone);

        return $resolver;
    }

    public function testStartStopsAllRunningTimeLogsGlobally(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('persist');
        $repository = $this->getMockBuilder(TimeLogRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getEntityManager', 'stopAllRunningTimeLogs'])
            ->getMock();
        $repository->method('getEntityManager')->willReturn($entityManager);
        $repository->expects(self::once())
            ->method('stopAllRunningTimeLogs')
            ->willReturn(1);

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

    public function testActiveTaskReturnsTaskForOpenLog(): void
    {
        $task = (new Task())->setName('active');
        $timeLog = (new TimeLog())
            ->setTask($task)
            ->setStartTime(new \DateTimeImmutable('2026-07-09 09:00:00', new \DateTimeZone('Europe/Riga')));
        $repository = $this->getMockBuilder(TimeLogRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findActive'])
            ->getMock();
        $repository->expects(self::once())
            ->method('findActive')
            ->willReturn($timeLog);

        $service = $this->serviceWithTask($repository, null);

        self::assertSame(
            $task,
            $service->activeTask()
        );
    }

    public function testActiveTaskReturnsNullWhenNoOpenLog(): void
    {
        $repository = $this->getMockBuilder(TimeLogRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findActive'])
            ->getMock();
        $repository->method('findActive')->willReturn(null);

        $service = $this->serviceWithTask($repository, null);

        self::assertNull($service->activeTask());
    }

    public function testTodayLoggedSecondsIncludesCompletedAndActiveLogs(): void
    {
        $timezone = new \DateTimeZone('Europe/Riga');
        $completed = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-07-09 09:00:00', $timezone))
            ->setEndTime(new \DateTimeImmutable('2026-07-09 10:00:00', $timezone));
        $active = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-07-09 11:30:00', $timezone));
        $repository = $this->getMockBuilder(TimeLogRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findOverlappingRange'])
            ->getMock();
        $repository->method('findOverlappingRange')->willReturn([$completed, $active]);

        $service = $this->serviceWithTask($repository, null);

        self::assertSame(
            5400,
            $service->todayLoggedSeconds(new \DateTimeImmutable('2026-07-09 12:00:00', $timezone))
        );
    }

    public function testTodayLoggedSecondsUsesFullDayForCompletedLogsAndNowForActiveLogs(): void
    {
        $timezone = new \DateTimeZone('Europe/Riga');
        $futureCompleted = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-07-09 23:00:00', $timezone))
            ->setEndTime(new \DateTimeImmutable('2026-07-09 23:30:00', $timezone));
        $active = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-07-09 11:30:00', $timezone));
        $repository = $this->getMockBuilder(TimeLogRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findOverlappingRange'])
            ->getMock();
        $repository->expects(self::once())
            ->method('findOverlappingRange')
            ->with(
                self::callback(static fn (\DateTimeInterface $date): bool => '2026-07-08 21:00:00+00:00' === $date->format('Y-m-d H:i:sP')),
                self::callback(static fn (\DateTimeInterface $date): bool => '2026-07-09 21:00:00+00:00' === $date->format('Y-m-d H:i:sP')),
            )
            ->willReturn([$futureCompleted, $active]);

        $service = $this->serviceWithTask($repository, null);

        self::assertSame(
            3600,
            $service->todayLoggedSeconds(new \DateTimeImmutable('2026-07-09 12:00:00', $timezone))
        );
    }

    public function testTodayLoggedSecondsClipsLogCrossingMidnight(): void
    {
        $timezone = new \DateTimeZone('Europe/Riga');
        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-07-08 23:30:00', $timezone))
            ->setEndTime(new \DateTimeImmutable('2026-07-09 00:30:00', $timezone));
        $repository = $this->getMockBuilder(TimeLogRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findOverlappingRange'])
            ->getMock();
        $repository->method('findOverlappingRange')->willReturn([$timeLog]);

        $service = $this->serviceWithTask($repository, null);

        self::assertSame(
            1800,
            $service->todayLoggedSeconds(new \DateTimeImmutable('2026-07-09 12:00:00', $timezone))
        );
    }

    public function testTodayLoggedSecondsCountsFullNormalAndDstDays(): void
    {
        $timezone = new \DateTimeZone('Europe/Riga');

        foreach ([
            ['2026-07-09', 86400],
            ['2026-03-29', 82800],
            ['2026-10-25', 90000],
        ] as [$date, $expectedSeconds]) {
            $timeLog = (new TimeLog())
                ->setStartTime(new \DateTimeImmutable("$date 00:00:00", $timezone))
                ->setEndTime((new \DateTimeImmutable("$date 00:00:00", $timezone))->modify('+1 day'));
            $repository = $this->getMockBuilder(TimeLogRepository::class)
                ->disableOriginalConstructor()
                ->onlyMethods(['findOverlappingRange'])
                ->getMock();
            $repository->method('findOverlappingRange')->willReturn([$timeLog]);

            self::assertSame(
                $expectedSeconds,
                $this->serviceWithTask($repository, null)->todayLoggedSeconds(
                    new \DateTimeImmutable("$date 12:00:00", $timezone)
                )
            );
        }
    }
}
