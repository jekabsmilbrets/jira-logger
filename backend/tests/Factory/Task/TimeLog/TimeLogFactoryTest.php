<?php

declare(strict_types=1);

namespace App\Tests\Factory\Task\TimeLog;

use App\Dto\Task\TimeLog\TimeLogRequest;
use App\Entity\Task\Task;
use App\Factory\Task\TimeLog\TimeLogFactory;
use App\Service\DateTime\DateInputParser;
use App\Service\DateTime\UserTimezoneResolver;
use PHPUnit\Framework\TestCase;

class TimeLogFactoryTest extends TestCase
{
    public function testCreateMapsDatesDescriptionAndTask(): void
    {
        $task = (new Task())->setName('TASK');
        $resolver = $this->createMock(UserTimezoneResolver::class);
        $resolver->method('resolveCurrentUserTimezone')->willReturn('UTC');
        $parser = new DateInputParser($resolver, 'UTC');

        $request = new TimeLogRequest();
        $request->setTask('id')->setStartTime('2026-05-01 10:00:00')->setEndTime('2026-05-01 11:00:00')->setDescription('work');

        $timeLog = TimeLogFactory::create($request, $task, $parser);

        self::assertSame($task, $timeLog->getTask());
        self::assertSame('work', $timeLog->getDescription());
        self::assertInstanceOf(\DateTimeImmutable::class, $timeLog->getStartTime());
        self::assertInstanceOf(\DateTimeImmutable::class, $timeLog->getEndTime());
    }

    public function testCreateNormalizesFlexibleDateInputs(): void
    {
        $task = (new Task())->setName('TASK');
        $resolver = $this->createMock(UserTimezoneResolver::class);
        $resolver->method('resolveCurrentUserTimezone')->willReturn('Europe/Vienna');
        $parser = new DateInputParser($resolver, 'UTC');

        $request = new TimeLogRequest();
        $request->setTask('id')->setStartTime('1780434000000')->setEndTime('2026-06-03 23:59:00');

        $timeLog = TimeLogFactory::create($request, $task, $parser);

        self::assertSame('2026-06-02T21:00:00+00:00', $timeLog->getStartTime()?->format(\DateTimeInterface::ATOM));
        self::assertSame('2026-06-03T21:59:00+00:00', $timeLog->getEndTime()?->format(\DateTimeInterface::ATOM));
    }
}
