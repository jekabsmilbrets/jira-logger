<?php

declare(strict_types=1);

namespace App\Tests\Factory\Task\TimeLog;

use App\Dto\Task\TimeLog\TimeLogRequest;
use App\Entity\Task\Task;
use App\Factory\Task\TimeLog\TimeLogFactory;
use App\Repository\Task\TaskRepository;
use App\Service\DateTime\DateInputParser;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\DateTime\UserTimezoneResolver;
use App\Service\Task\Filter\TaskFilterCriteriaFactory;
use App\Service\Task\JiraSync\TaskJiraSyncAdapter;
use App\Service\Task\TaskService;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class TimeLogFactoryTest extends TestCase
{
    public function testCreateMapsDatesDescriptionAndTask(): void
    {
        $task = (new Task())->setName('TASK');
        $taskRepository = $this->createMock(TaskRepository::class);
        $taskRepository->method('find')->willReturn($task);

        $resolver = $this->createMock(UserTimezoneResolver::class);
        $resolver->method('resolveCurrentUserTimezone')->willReturn('UTC');
        $parser = new DateInputParser($resolver, 'UTC');
        $dateRangeResolver = $this->createMock(TaskFilterDateRangeResolver::class);

        $request = new TimeLogRequest(
            new TaskService(
                $taskRepository,
                new TaskFilterCriteriaFactory($dateRangeResolver),
                $this->createMock(TaskJiraSyncAdapter::class),
            ),
            $parser
        );
        $request->setTask('id')->setStartTime('2026-05-01 10:00:00')->setEndTime('2026-05-01 11:00:00')->setDescription('work');

        $timeLog = TimeLogFactory::create($request);

        self::assertSame($task, $timeLog->getTask());
        self::assertSame('work', $timeLog->getDescription());
        self::assertInstanceOf(\DateTimeImmutable::class, $timeLog->getStartTime());
        self::assertInstanceOf(\DateTimeImmutable::class, $timeLog->getEndTime());
    }
}
