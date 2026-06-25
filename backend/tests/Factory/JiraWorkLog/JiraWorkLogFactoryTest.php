<?php

declare(strict_types=1);

namespace App\Tests\Factory\JiraWorkLog;

use App\Dto\JiraWorkLog\JiraWorkLogRequest;
use App\Entity\Task\Task;
use App\Factory\JiraWorkLog\JiraWorkLogFactory;
use PHPUnit\Framework\TestCase;

class JiraWorkLogFactoryTest extends TestCase
{
    public function testCreateMapsRequestToEntity(): void
    {
        $task = (new Task())->setName('TASK');
        $request = new JiraWorkLogRequest();
        $request->setDescription('note')->setTask('id-1')->setTimeSpentSeconds(120);

        $entity = JiraWorkLogFactory::create($request, $task);

        self::assertSame('note', $entity->getDescription());
        self::assertSame(120, $entity->getTimeSpentSeconds());
        self::assertSame($task, $entity->getTask());
    }
}
