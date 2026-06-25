<?php

declare(strict_types=1);

namespace App\Tests\Service\Task\Projection;

use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Service\Task\Filter\TaskFilterCriteria;
use App\Service\Task\Projection\TaskListProjection;
use PHPUnit\Framework\TestCase;

class TaskListProjectionTest extends TestCase
{
    public function testProjectsTimeLogsIntoRequestedRange(): void
    {
        $task = new Task();
        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-05-29 10:00:00'))
            ->setEndTime(new \DateTimeImmutable('2026-05-31 10:00:00'));
        $task->addTimeLog($timeLog);

        $result = (new TaskListProjection())->project(
            [$task],
            new TaskFilterCriteria(dateRange: [
                'startDate' => new \DateTimeImmutable('2026-05-30 00:00:00'),
                'endDate' => new \DateTimeImmutable('2026-05-30 23:59:59'),
            ])
        );

        self::assertSame([$task], $result);
        self::assertSame('2026-05-30 00:00:00', $timeLog->getStartTime()?->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 23:59:59', $timeLog->getEndTime()?->format('Y-m-d H:i:s'));
        self::assertTrue($timeLog->isManuallyModified());
    }

    public function testHideUnreportedRemovesTasksWithoutProjectedTimeLogs(): void
    {
        $reported = new Task();
        $reported->addTimeLog(
            (new TimeLog())
                ->setStartTime(new \DateTimeImmutable('2026-05-30 10:00:00'))
                ->setEndTime(new \DateTimeImmutable('2026-05-30 11:00:00'))
        );
        $unreported = new Task();

        $result = (new TaskListProjection())->project(
            [$reported, $unreported],
            new TaskFilterCriteria(hideUnreported: true)
        );

        self::assertSame([$reported], $result);
    }
}
