<?php

declare(strict_types=1);

namespace App\Tests\Entity\JiraWorkLog;

use App\Entity\JiraWorkLog\JiraWorkLog;
use App\Entity\Task\Task;
use App\Tests\Support\EntityIdSetter;
use PHPUnit\Framework\TestCase;

class JiraWorkLogEntityTest extends TestCase
{
    use EntityIdSetter;

    public function testAccessorsAndToArray(): void
    {
        $task = (new Task())->setName('TASK-1');
        $workLog = new JiraWorkLog();
        $start = new \DateTimeImmutable('2026-01-01T10:00:00+00:00');

        $this->setEntityId($workLog, '123e4567-e89b-12d3-a456-426614174000');

        $workLog
            ->setTask($task)
            ->setWorkLogId('wl-1')
            ->setDescription('desc')
            ->setTimeSpentSeconds(300)
            ->setStartTime($start);

        $array = $workLog->toArray();

        self::assertSame('wl-1', $array['workLogId']);
        self::assertSame(300, $array['timeSpentSeconds']);
        self::assertSame($start, $array['startTime']);
        self::assertSame($task, $array['task']);
    }
}
