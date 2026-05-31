<?php

declare(strict_types=1);

namespace App\Tests\Dto\JiraWorkLog;

use App\Dto\JiraWorkLog\JiraWorkLogRequest;
use App\Entity\Task\Task;
use App\Repository\Task\TaskRepository;
use App\Service\Task\TaskService;
use PHPUnit\Framework\TestCase;

class JiraWorkLogRequestTest extends TestCase
{
    public function testSetTaskResolvesTaskById(): void
    {
        $task = (new Task())->setName('T1');
        $repository = $this->createMock(TaskRepository::class);
        $repository->method('find')->with('id-1')->willReturn($task);
        $request = new JiraWorkLogRequest(new TaskService($repository));

        $request->setTask('id-1');

        self::assertSame($task, $request->getTask());
    }

    public function testSetTaskKeepsNullWhenTaskNotFound(): void
    {
        $repository = $this->createMock(TaskRepository::class);
        $repository->method('find')->willReturn(null);
        $request = new JiraWorkLogRequest(new TaskService($repository));

        $request->setTask('missing');

        self::assertNull($request->getTask());
    }
}
