<?php

declare(strict_types=1);

namespace App\Tests\Service\Task\ReportedTask;

use App\Dto\Task\TaskListFilterRequest;
use App\Entity\JiraWorkLog\JiraWorkLog;
use App\Entity\Tag\Tag;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Repository\Task\TaskRepository;
use App\Serializer\Normalizer\JsonApiResponseNormalizer;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\Task\ReportedTask\ReportedTaskQuery;
use App\Service\Task\ReportedTask\ReportedTaskView;
use App\Tests\Support\EntityIdSetter;
use Doctrine\ORM\Query;
use Doctrine\ORM\QueryBuilder;
use PHPUnit\Framework\TestCase;

final class ReportedTaskQueryTest extends TestCase
{
    use EntityIdSetter;

    public function testListNormalizesFilterIntent(): void
    {
        $filter = (new TaskListFilterRequest())
            ->setTags('550e8400-e29b-41d4-a716-446655440000, invalid')
            ->setName(' backend ')
            ->setDate('2026-06-01')
            ->setHideUnreported('true');
        $dateRange = [
            'startDate' => new \DateTimeImmutable('2026-06-01 00:00:00'),
            'endDate' => new \DateTimeImmutable('2026-06-01 23:59:59'),
        ];
        $resolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $resolver
            ->expects(self::once())
            ->method('resolve')
            ->with('2026-06-01', null, null)
            ->willReturn($dateRange);
        $repository = $this->repositoryWithQueryResult([$this->task('task-id')], $parameters);

        self::assertSame([], (new ReportedTaskQuery($repository, $resolver))->list($filter));
        self::assertSame(['550e8400-e29b-41d4-a716-446655440000'], $parameters['tagIds']);
        self::assertSame($dateRange['startDate'], $parameters['startTime']);
        self::assertSame($dateRange['endDate'], $parameters['endTime']);
        self::assertSame('%backend%', $parameters['name']);
    }

    public function testListWithoutQueryFiltersUsesAllTasksAndReturnsReadViews(): void
    {
        $task = $this->task('task-id');
        $resolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $resolver->expects(self::once())->method('resolve')->with(null, null, null)->willReturn(null);
        $repository = $this->getMockBuilder(TaskRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findAll'])
            ->getMock();
        $repository->expects(self::once())->method('findAll')->willReturn([$task]);

        $result = (new ReportedTaskQuery($repository, $resolver))->list(new TaskListFilterRequest());

        self::assertContainsOnlyInstancesOf(ReportedTaskView::class, $result);
        self::assertSame('task-id', $result[0]->id);
        self::assertSame('Task', $result[0]->name);
    }

    public function testListProjectsTimeLogsWithoutMutatingManagedEntities(): void
    {
        $task = $this->task('task-id');
        $timeLog = $this->timeLog(
            'log-id',
            new \DateTimeImmutable('2026-05-29 10:00:00'),
            new \DateTimeImmutable('2026-05-31 10:00:00'),
        );
        $task->addTimeLog($timeLog);
        $dateRange = [
            'startDate' => new \DateTimeImmutable('2026-05-30 00:00:00'),
            'endDate' => new \DateTimeImmutable('2026-05-30 23:59:59'),
        ];
        $resolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $resolver->method('resolve')->willReturn($dateRange);
        $repository = $this->repositoryWithQueryResult([$task]);

        $result = (new ReportedTaskQuery($repository, $resolver))->list(
            (new TaskListFilterRequest())->setDate('2026-05-30'),
        );
        $projectedTimeLog = $result[0]->timeLogs[0];

        self::assertSame('2026-05-30 00:00:00', $projectedTimeLog['startTime']->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 23:59:59', $projectedTimeLog['endTime']->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-29 10:00:00', $projectedTimeLog['originalStartTime']->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-31 10:00:00', $projectedTimeLog['originalEndTime']->format('Y-m-d H:i:s'));
        self::assertTrue($projectedTimeLog['manuallyModified']);
        self::assertSame('2026-05-29 10:00:00', $timeLog->getStartTime()?->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-31 10:00:00', $timeLog->getEndTime()?->format('Y-m-d H:i:s'));
        self::assertFalse($timeLog->isManuallyModified());
        self::assertNull($timeLog->getOriginalStartTime());
        self::assertNull($timeLog->getOriginalEndTime());
    }

    public function testListSerializesFilteredTimeLogsAsList(): void
    {
        $task = $this->task('task-id');
        $task->addTimeLog($this->timeLog(
            'excluded-log-id',
            new \DateTimeImmutable('2026-05-29 10:00:00'),
            new \DateTimeImmutable('2026-05-29 11:00:00'),
        ));
        $task->addTimeLog($this->timeLog(
            'included-log-id',
            new \DateTimeImmutable('2026-05-30 10:00:00'),
            new \DateTimeImmutable('2026-05-30 11:00:00'),
        ));
        $dateRange = [
            'startDate' => new \DateTimeImmutable('2026-05-30 00:00:00'),
            'endDate' => new \DateTimeImmutable('2026-05-30 23:59:59'),
        ];
        $resolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $resolver->method('resolve')->willReturn($dateRange);
        $repository = $this->repositoryWithQueryResult([$task]);
        $views = (new ReportedTaskQuery($repository, $resolver))->list(
            (new TaskListFilterRequest())->setDate('2026-05-30'),
        );

        $response = (new JsonApiResponseNormalizer())->normalize($views);

        self::assertTrue(array_is_list($response['data'][0]['timeLogs']));
        self::assertSame('included-log-id', $response['data'][0]['timeLogs'][0]['id']);
    }

    public function testListKeepsOverlappingOpenLogsOpenAndSelectsThemAsLast(): void
    {
        $task = $this->task('task-id');
        $openLog = $this->timeLog(
            'open-log-id',
            new \DateTimeImmutable('2026-05-29 10:00:00'),
            null,
        );
        $task->addTimeLog($openLog);
        $dateRange = [
            'startDate' => new \DateTimeImmutable('2026-05-30 00:00:00'),
            'endDate' => new \DateTimeImmutable('2026-05-30 23:59:59'),
        ];
        $resolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $resolver->method('resolve')->willReturn($dateRange);
        $repository = $this->repositoryWithQueryResult([$task]);

        $result = (new ReportedTaskQuery($repository, $resolver))->list(
            (new TaskListFilterRequest())->setDate('2026-05-30'),
        );

        self::assertNull($result[0]->timeLogs[0]['endTime']);
        self::assertSame('open-log-id', $result[0]->lastTimeLog['id']);
    }

    public function testListHidesTasksWithoutReportedTimeLogs(): void
    {
        $reported = $this->task('reported-id');
        $reported->addTimeLog(
            $this->timeLog(
                'log-id',
                new \DateTimeImmutable('2026-05-30 10:00:00'),
                new \DateTimeImmutable('2026-05-30 11:00:00'),
            ),
        );
        $unreported = $this->task('unreported-id');
        $resolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $resolver->method('resolve')->willReturn(null);
        $repository = $this->getMockBuilder(TaskRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findAll'])
            ->getMock();
        $repository->method('findAll')->willReturn([$reported, $unreported]);

        $result = (new ReportedTaskQuery($repository, $resolver))->list(
            (new TaskListFilterRequest())->setHideUnreported(true),
        );

        self::assertSame(['reported-id'], array_column($result, 'id'));
    }

    public function testReadViewPreservesTaskSerializationShape(): void
    {
        $task = $this->task('task-id');
        $task->addTimeLog(
            $this->timeLog(
                'log-id',
                new \DateTimeImmutable('2026-05-30 10:00:00'),
                new \DateTimeImmutable('2026-05-30 11:00:00'),
            ),
        );
        $tag = (new Tag())->setName('Tag');
        $this->setEntityId($tag, 'tag-id');
        $task->addTag($tag);
        $workLog = (new JiraWorkLog())
            ->setWorkLogId('work-log')
            ->setTimeSpentSeconds(3600)
            ->setStartTime(new \DateTimeImmutable('2026-05-30'));
        $this->setEntityId($workLog, 'work-log-id');
        $task->addJiraWorkLog($workLog);
        $resolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $resolver->method('resolve')->willReturn(null);
        $repository = $this->getMockBuilder(TaskRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findAll'])
            ->getMock();
        $repository->method('findAll')->willReturn([$task]);
        $views = (new ReportedTaskQuery($repository, $resolver))->list(new TaskListFilterRequest());

        $response = (new JsonApiResponseNormalizer())->normalize($views);

        self::assertSame(
            [
                'name',
                'description',
                'timeLogs',
                'tags',
                'lastTimeLog',
                'jiraWorkLogs',
                'id',
                'createdAt',
                'updatedAt',
            ],
            array_keys($response['data'][0]),
        );
        self::assertSame(
            [
                'startTime',
                'endTime',
                'description',
                'manuallyModified',
                'originalStartTime',
                'originalEndTime',
                'id',
                'createdAt',
                'updatedAt',
            ],
            array_keys($response['data'][0]['timeLogs'][0]),
        );
        self::assertSame(
            ['name', 'id', 'createdAt', 'updatedAt', 'isUsed'],
            array_keys($response['data'][0]['tags'][0]),
        );
        self::assertSame(
            ['workLogId', 'description', 'timeSpentSeconds', 'startTime', 'id', 'createdAt', 'updatedAt'],
            array_keys($response['data'][0]['jiraWorkLogs'][0]),
        );
    }

    private function task(string $id): Task
    {
        $task = (new Task())->setName('Task');
        $this->setEntityId($task, $id);

        return $task;
    }

    private function timeLog(
        string $id,
        \DateTimeImmutable $startTime,
        ?\DateTimeImmutable $endTime,
    ): TimeLog {
        $timeLog = (new TimeLog())
            ->setStartTime($startTime)
            ->setEndTime($endTime);
        $this->setEntityId($timeLog, $id);

        return $timeLog;
    }

    /**
     * @param Task[] $tasks
     */
    private function repositoryWithQueryResult(array $tasks, ?array &$parameters = null): TaskRepository
    {
        $parameters = [];
        $query = $this->createMock(Query::class);
        $query->method('getResult')->willReturn($tasks);
        $queryBuilder = $this->createMock(QueryBuilder::class);
        $queryBuilder->method('leftJoin')->willReturnSelf();
        $queryBuilder->method('andWhere')->willReturnSelf();
        $queryBuilder->method('setParameter')->willReturnCallback(
            static function (string $name, mixed $value) use (&$parameters, $queryBuilder): QueryBuilder {
                $parameters[$name] = $value;

                return $queryBuilder;
            },
        );
        $queryBuilder->method('getQuery')->willReturn($query);
        $repository = $this->getMockBuilder(TaskRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['createQueryBuilder'])
            ->getMock();
        $repository->method('createQueryBuilder')->willReturn($queryBuilder);

        return $repository;
    }
}
