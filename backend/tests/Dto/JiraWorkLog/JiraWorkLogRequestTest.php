<?php

declare(strict_types=1);

namespace App\Tests\Dto\JiraWorkLog;

use App\Dto\JiraWorkLog\JiraWorkLogRequest;
use App\Entity\Task\Task;
use App\Repository\Task\TaskRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\Tag\TagService;
use App\Service\Task\Filter\TaskFilterCriteriaFactory;
use App\Service\Task\Input\TaskInputFactory;
use App\Service\Task\JiraSync\TaskJiraSyncAdapter;
use App\Service\Task\TaskService;
use PHPUnit\Framework\TestCase;

class JiraWorkLogRequestTest extends TestCase
{
    private function taskService(TaskRepository $repository): TaskService
    {
        return new TaskService(
            $repository,
            new TaskFilterCriteriaFactory($this->createMock(TaskFilterDateRangeResolver::class)),
            $this->createMock(TaskJiraSyncAdapter::class),
            new TaskInputFactory($this->createMock(TagService::class))
        );
    }

    public function testSetTaskResolvesTaskById(): void
    {
        $task = (new Task())->setName('T1');
        $repository = $this->createMock(TaskRepository::class);
        $repository->method('find')->with('id-1')->willReturn($task);
        $request = new JiraWorkLogRequest($this->taskService($repository));

        $request->setTask('id-1');

        self::assertSame($task, $request->getTask());
    }

    public function testSetTaskKeepsNullWhenTaskNotFound(): void
    {
        $repository = $this->createMock(TaskRepository::class);
        $repository->method('find')->willReturn(null);
        $request = new JiraWorkLogRequest($this->taskService($repository));

        $request->setTask('missing');

        self::assertNull($request->getTask());
    }
}
