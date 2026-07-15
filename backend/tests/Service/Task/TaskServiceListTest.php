<?php

declare(strict_types=1);

namespace App\Tests\Service\Task;

use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Repository\Task\TaskRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\Tag\TagService;
use App\Service\Task\JiraSync\JiraTaskSyncService;
use App\Service\Task\TaskService;
use Doctrine\ORM\Query;
use Doctrine\ORM\QueryBuilder;
use PHPUnit\Framework\TestCase;

class TaskServiceListTest extends TestCase
{
    public function testListNormalizesFilterIntent(): void
    {
        $filter = [
            'tags' => '550e8400-e29b-41d4-a716-446655440000, invalid',
            'name' => ' backend ',
            'date' => '2026-06-01',
            'hideUnreported' => 'true',
        ];
        $dateRange = [
            'startDate' => new \DateTimeImmutable('2026-06-01 00:00:00'),
            'endDate' => new \DateTimeImmutable('2026-06-01 23:59:59'),
        ];
        $resolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $resolver->expects(self::once())->method('resolveTaskFilter')->with($filter)->willReturn($dateRange);
        $repository = $this->repositoryWithQueryResult([new Task()], $parameters);

        self::assertSame([], $this->service($repository, $resolver)->list($filter));
        self::assertSame(['550e8400-e29b-41d4-a716-446655440000'], $parameters['tagIds']);
        self::assertSame($dateRange['startDate'], $parameters['startTime']);
        self::assertSame($dateRange['endDate'], $parameters['endTime']);
        self::assertSame('%backend%', $parameters['name']);
    }

    public function testListWithoutFiltersUsesAllTasks(): void
    {
        $task = new Task();
        $resolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $resolver->expects(self::never())->method('resolveTaskFilter');
        $repository = $this->getMockBuilder(TaskRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findAll'])
            ->getMock();
        $repository->expects(self::once())->method('findAll')->willReturn([$task]);

        self::assertSame([$task], $this->service($repository, $resolver)->list(null));
    }

    public function testListProjectsTimeLogsIntoRequestedRange(): void
    {
        $task = new Task();
        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-05-29 10:00:00'))
            ->setEndTime(new \DateTimeImmutable('2026-05-31 10:00:00'));
        $task->addTimeLog($timeLog);
        $dateRange = [
            'startDate' => new \DateTimeImmutable('2026-05-30 00:00:00'),
            'endDate' => new \DateTimeImmutable('2026-05-30 23:59:59'),
        ];
        $resolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $resolver->method('resolveTaskFilter')->willReturn($dateRange);
        $repository = $this->repositoryWithQueryResult([$task]);

        $result = $this->service($repository, $resolver)->list(['date' => '2026-05-30']);

        self::assertSame([$task], $result);
        self::assertSame('2026-05-30 00:00:00', $timeLog->getStartTime()?->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 23:59:59', $timeLog->getEndTime()?->format('Y-m-d H:i:s'));
        self::assertTrue($timeLog->isManuallyModified());
    }

    public function testListHidesUnreportedTasks(): void
    {
        $reported = new Task();
        $reported->addTimeLog(
            (new TimeLog())
                ->setStartTime(new \DateTimeImmutable('2026-05-30 10:00:00'))
                ->setEndTime(new \DateTimeImmutable('2026-05-30 11:00:00')),
        );
        $unreported = new Task();
        $resolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $resolver->method('resolveTaskFilter')->willReturn(null);
        $repository = $this->getMockBuilder(TaskRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findAll'])
            ->getMock();
        $repository->method('findAll')->willReturn([$reported, $unreported]);

        $result = $this->service($repository, $resolver)->list(['hideUnreported' => true]);

        self::assertSame([$reported], $result);
    }

    private function service(
        TaskRepository $repository,
        TaskFilterDateRangeResolver $resolver,
    ): TaskService {
        return new TaskService(
            $repository,
            $resolver,
            $this->createMock(JiraTaskSyncService::class),
            $this->createMock(TagService::class),
        );
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
