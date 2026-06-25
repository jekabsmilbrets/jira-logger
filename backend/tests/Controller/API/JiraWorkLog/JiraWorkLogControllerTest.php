<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\JiraWorkLog;

use App\Controller\API\JiraWorkLog\JiraWorkLogController;
use App\Entity\JiraWorkLog\JiraWorkLog;
use App\Repository\JiraWorkLog\JiraWorkLogRepository;
use App\Service\JiraWorkLog\JiraWorkLogService;
use App\Service\Task\TaskService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;

class JiraWorkLogControllerTest extends TestCase
{
    private function controllerWith(JiraWorkLogRepository $repository): JiraWorkLogController
    {
        $controller = new JiraWorkLogController(
            new JiraWorkLogService($repository, $this->createMock(TaskService::class))
        );
        $controller->setContainer(new Container());

        return $controller;
    }

    public function testListReturnsNotFoundWhenNoRows(): void
    {
        $repository = $this->createMock(JiraWorkLogRepository::class);
        $repository->method('findAll')->willReturn([]);

        self::assertSame(404, $this->controllerWith($repository)->list()->getStatusCode());
    }

    public function testShowReturnsOkWhenFound(): void
    {
        $item = (new JiraWorkLog())
            ->setWorkLogId('wl')
            ->setStartTime(new \DateTimeImmutable('2026-01-01'))
            ->setTimeSpentSeconds(60);

        $repository = $this->createMock(JiraWorkLogRepository::class);
        $repository->method('find')->willReturn($item);

        self::assertSame(200, $this->controllerWith($repository)->show('id')->getStatusCode());
    }
}
