<?php

declare(strict_types=1);

namespace App\Tests\Entity\Task;

use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use PHPUnit\Framework\TestCase;

class TaskTest extends TestCase
{
    public function testGetLastTimeLogReturnsOpenLogWhenPresent(): void
    {
        $task = new Task();
        $oldStoppedLog = (new TimeLog())
            ->setStartTime(new \DateTime('2026-05-30 08:00:00'))
            ->setEndTime(new \DateTime('2026-05-30 09:00:00'));
        $openLog = (new TimeLog())
            ->setStartTime(new \DateTime('2026-05-30 07:00:00'));

        $task->addTimeLog($oldStoppedLog);
        $task->addTimeLog($openLog);

        self::assertSame($openLog, $task->getLastTimeLog());
    }

    public function testGetLastTimeLogReturnsGreatestStartTimeWhenNoOpenLogExists(): void
    {
        $task = new Task();
        $earlierLog = (new TimeLog())
            ->setStartTime(new \DateTime('2026-05-30 08:00:00'))
            ->setEndTime(new \DateTime('2026-05-30 09:00:00'));
        $laterLog = (new TimeLog())
            ->setStartTime(new \DateTime('2026-05-30 10:00:00'))
            ->setEndTime(new \DateTime('2026-05-30 11:00:00'));

        $task->addTimeLog($earlierLog);
        $task->addTimeLog($laterLog);

        self::assertSame($laterLog, $task->getLastTimeLog());
    }
}
