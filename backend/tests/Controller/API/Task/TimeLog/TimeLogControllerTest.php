<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\Task\TimeLog;

use App\Controller\API\Task\TimeLog\TimeLogController;
use App\Entity\Task\TimeLog\TimeLog;
use App\Repository\Task\TaskRepository;
use App\Repository\Task\TimeLog\TimeLogRepository;
use App\Service\DateTime\DateInputParser;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\Task\Filter\TaskFilterCriteriaFactory;
use App\Service\Task\JiraSync\TaskJiraSyncAdapter;
use App\Service\Task\TaskService;
use App\Service\Task\TimeLog\TimeLogService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;

class TimeLogControllerTest extends TestCase
{
    private function controllerWith(TimeLogRepository $timeLogRepository): TimeLogController
    {
        $controller = new TimeLogController(
            new TimeLogService(
                $timeLogRepository,
                new TaskService(
                    $this->createMock(TaskRepository::class),
                    new TaskFilterCriteriaFactory($this->createMock(TaskFilterDateRangeResolver::class)),
                    $this->createMock(TaskJiraSyncAdapter::class),
                ),
                $this->createMock(DateInputParser::class),
            ),
        );
        $controller->setContainer(new Container());

        return $controller;
    }

    public function testListReturnsNotFoundWhenEmpty(): void
    {
        $repository = $this->createMock(TimeLogRepository::class);
        $repository->method('findBy')->willReturn([]);

        self::assertSame(404, $this->controllerWith($repository)->list('task-id')->getStatusCode());
    }

    public function testShowReturnsOkWhenFound(): void
    {
        $timeLog = (new TimeLog())->setStartTime(new \DateTimeImmutable('2026-01-01'));
        $repository = $this->createMock(TimeLogRepository::class);
        $repository->method('findOneBy')->willReturn($timeLog);

        self::assertSame(200, $this->controllerWith($repository)->show('task-id', 'log-id')->getStatusCode());
    }
}
