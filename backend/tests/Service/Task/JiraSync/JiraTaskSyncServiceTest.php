<?php

declare(strict_types=1);

namespace App\Tests\Service\Task\JiraSync;

use App\Dto\Task\JiraTaskSearchRequest;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Exception\JiraApiServiceException;
use App\Repository\JiraWorkLog\JiraWorkLogRepository;
use App\Repository\Task\TaskRepository;
use App\Service\DateTime\DateInputParser;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\DateTime\UserTimezoneResolver;
use App\Service\JiraApi\JiraApiService;
use App\Service\Task\JiraSync\JiraTaskSyncService;
use App\Service\Task\Sync\TaskSyncStatus;
use Doctrine\ORM\EntityManagerInterface;
use JiraRestApi\Issue\Worklog;
use PHPUnit\Framework\TestCase;

final class JiraTaskSyncServiceTest extends TestCase
{
    public function testCalculateTimeSpentUsesClippedIntervalsWithoutMutatingTimeLog(): void
    {
        $start = new \DateTime('2026-05-29 10:00:00');
        $end = new \DateTime('2026-05-31 10:00:00');
        $task = (new Task())->setName('TASK-1');
        $timeLog = (new TimeLog())
            ->setStartTime($start)
            ->setEndTime($end)
            ->setDescription('Long task');
        $task->addTimeLog($timeLog);
        $jiraApiService = $this->createMock(JiraApiService::class);
        $jiraApiService
            ->expects(self::once())
            ->method('syncWorkLog')
            ->with($task, null, self::isInstanceOf(\DateTime::class), 86399, 'Long task')
            ->willReturn($this->workLog());

        $result = $this->createService(jiraApiService: $jiraApiService, task: $task)
            ->syncTask('task-id', '2026-05-30');

        self::assertSame(TaskSyncStatus::Synced, $result->status);
        self::assertSame('2026-05-29 10:00:00', $timeLog->getStartTime()?->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-31 10:00:00', $timeLog->getEndTime()?->format('Y-m-d H:i:s'));
    }

    public function testFilterIncludesTimeLogSpanningWholeRequestedRange(): void
    {
        $task = (new Task())->setName('TASK-1');
        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTime('2026-05-29 00:00:00'))
            ->setEndTime(new \DateTime('2026-05-31 00:00:00'));
        $task->addTimeLog($timeLog);
        $jiraApiService = $this->createMock(JiraApiService::class);
        $jiraApiService
            ->expects(self::once())
            ->method('syncWorkLog')
            ->with($task, null, self::isInstanceOf(\DateTime::class), 86399, '')
            ->willReturn($this->workLog());

        $result = $this->createService(jiraApiService: $jiraApiService, task: $task)
            ->syncTask('task-id', '2026-05-30');

        self::assertSame(TaskSyncStatus::Synced, $result->status);
    }

    public function testUtcSyncUsesBackendIdentityAndUtcJiraReportingTime(): void
    {
        $facts = $this->captureSyncFacts('UTC', '2026-05-30');

        self::assertSame(
            '2026-05-30 00:00:00 '.date_default_timezone_get(),
            $facts['identity'],
        );
        self::assertSame('2026-05-30T17:00:00+00:00', $facts['jiraStart']);
        self::assertSame(86399, $facts['timeSpentSeconds']);
    }

    public function testWinterSyncUsesNamedUserTimezoneOffset(): void
    {
        $facts = $this->captureSyncFacts('Europe/Vienna', '2026-01-15');

        self::assertSame('2026-01-15T17:00:00+01:00', $facts['jiraStart']);
    }

    public function testSummerSyncUsesNamedUserTimezoneOffset(): void
    {
        $facts = $this->captureSyncFacts('Europe/Vienna', '2026-06-23');

        self::assertSame('2026-06-23T17:00:00+02:00', $facts['jiraStart']);
    }

    public function testDstTransitionClipsTheShortenedUserDay(): void
    {
        $facts = $this->captureSyncFacts('Europe/Vienna', '2026-03-29');

        self::assertSame('2026-03-29T17:00:00+02:00', $facts['jiraStart']);
        self::assertSame(82799, $facts['timeSpentSeconds']);
    }

    public function testFlexibleInputUsesOneCanonicalDateForRangeIdentityAndJira(): void
    {
        $facts = $this->captureSyncFacts('UTC', '31/05/2026');

        self::assertSame(
            '2026-05-31 00:00:00 '.date_default_timezone_get(),
            $facts['identity'],
        );
        self::assertSame('2026-05-31T17:00:00+00:00', $facts['jiraStart']);
        self::assertSame(86399, $facts['timeSpentSeconds']);
    }

    public function testIdentityIsStableWhileJiraOffsetsFollowDifferentUserTimezones(): void
    {
        $viennaFacts = $this->captureSyncFacts('Europe/Vienna', '2026-06-23');
        $newYorkFacts = $this->captureSyncFacts('America/New_York', '2026-06-23');

        self::assertSame($viennaFacts['identity'], $newYorkFacts['identity']);
        self::assertSame('2026-06-23T17:00:00+02:00', $viennaFacts['jiraStart']);
        self::assertSame('2026-06-23T17:00:00-04:00', $newYorkFacts['jiraStart']);
    }

    public function testSyncTaskTranslatesJiraServiceFailureToTaskSyncFailure(): void
    {
        $jiraApiService = $this->createMock(JiraApiService::class);
        $jiraApiService
            ->method('syncWorkLog')
            ->willThrowException(new JiraApiServiceException('Jira disabled'));

        $result = $this->createService(
            jiraApiService: $jiraApiService,
            task: (new Task())->setName('TASK-1'),
        )->syncTask('task-id', '2026-06-23');

        self::assertSame(TaskSyncStatus::Failed, $result->status);
        self::assertSame('Jira disabled', $result->errorMessage);
    }

    public function testSyncTaskReturnsNotFoundWhenTaskIsMissing(): void
    {
        $result = $this->createService()->syncTask('missing', '2026-06-23');

        self::assertSame(TaskSyncStatus::NotFound, $result->status);
    }

    public function testSyncTaskDoesNotTranslateDateResolutionFailures(): void
    {
        $dateRangeResolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $dateRangeResolver
            ->method('resolve')
            ->with(date: 'invalid')
            ->willThrowException(new \InvalidArgumentException('invalid date'));

        $service = $this->createService(
            task: (new Task())->setName('TASK-1'),
            dateRangeResolver: $dateRangeResolver,
        );

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('invalid date');

        $service->syncTask('task-id', 'invalid');
    }

    public function testSyncTaskWritesJiraBeforeLocalPersistenceFailureEscapes(): void
    {
        $task = (new Task())->setName('TASK-1');
        $jiraApiService = $this->createMock(JiraApiService::class);
        $jiraApiService
            ->expects(self::once())
            ->method('syncWorkLog')
            ->willReturn($this->workLog());
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('persist');
        $entityManager
            ->expects(self::once())
            ->method('flush')
            ->willThrowException(new \RuntimeException('db down'));

        $service = $this->createService(
            jiraApiService: $jiraApiService,
            task: $task,
            jiraWorkLogRepository: $this->jiraWorkLogRepository($entityManager),
        );

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('db down');

        $service->syncTask('task-id', '2026-06-23');
    }

    public function testMissingTasksExcludeKeyOnlyLegacyCaseAndChangedSummaries(): void
    {
        $localTasks = [
            (new Task())->setName(' ABC-1 '),
            (new Task())->setName('abc-2 -#- old summary'),
            (new Task())->setName('not a Jira task'),
        ];
        $jiraApiService = $this->createMock(JiraApiService::class);
        $jiraApiService
            ->method('getIssueKeyFromTask')
            ->willReturnCallback(static fn (Task $task): string => trim(explode('-#-', $task->getName(), 2)[0]));
        $jiraApiService
            ->expects(self::once())
            ->method('searchIssues')
            ->with(self::isInstanceOf(JiraTaskSearchRequest::class))
            ->willReturn([
                ['key' => 'ABC-1', 'summary' => 'Current', 'status' => 'Open', 'issueType' => 'Task', 'updated' => null],
                ['key' => 'ABC-2', 'summary' => 'Changed', 'status' => 'Open', 'issueType' => 'Task', 'updated' => null],
                ['key' => 'ABC-3', 'summary' => 'Missing', 'status' => 'Open', 'issueType' => 'Bug', 'updated' => '2026-07-25T12:30:00+03:00'],
                ['key' => 'abc-3', 'summary' => 'Duplicate', 'status' => 'Open', 'issueType' => 'Bug', 'updated' => null],
            ]);

        $result = $this->createService(
            jiraApiService: $jiraApiService,
            allTasks: $localTasks,
        )->findMissingTasks(new JiraTaskSearchRequest());

        self::assertFalse($result['truncated']);
        self::assertSame(['ABC-3'], array_column($result['data'], 'key'));
    }

    public function testMissingTasksReturnDefaultLimitAndTruncationFlag(): void
    {
        $jiraApiService = $this->createMock(JiraApiService::class);
        $jiraApiService->method('searchIssues')->willReturnCallback(static function (): iterable {
            for ($index = 1; $index <= 51; ++$index) {
                yield [
                    'key' => 'ABC-'.$index,
                    'summary' => 'Issue '.$index,
                    'status' => 'Open',
                    'issueType' => 'Task',
                    'updated' => null,
                ];
            }
        });

        $result = $this->createService(jiraApiService: $jiraApiService)
            ->findMissingTasks(new JiraTaskSearchRequest());

        self::assertTrue($result['truncated']);
        self::assertCount(50, $result['data']);
        self::assertSame('ABC-50', $result['data'][49]['key']);
    }

    /**
     * @return array{identity: string, jiraStart: string, timeSpentSeconds: int}
     */
    private function captureSyncFacts(string $userTimezone, string $date): array
    {
        $task = (new Task())->setName('TASK-1');
        $task->addTimeLog(
            (new TimeLog())
                ->setStartTime(new \DateTime('2025-01-01T00:00:00+00:00'))
                ->setEndTime(new \DateTime('2027-01-01T00:00:00+00:00'))
        );
        $identity = null;
        $jiraStart = null;
        $timeSpentSeconds = null;
        $jiraWorkLogRepository = $this->jiraWorkLogRepository();
        $jiraWorkLogRepository
            ->method('findOneBy')
            ->willReturnCallback(
                static function (array $criteria) use (&$identity): null {
                    self::assertInstanceOf(\DateTime::class, $criteria['startTime']);
                    $identity = $criteria['startTime']->format('Y-m-d H:i:s e');

                    return null;
                }
            );
        $workLog = $this->workLog();
        $jiraApiService = $this->createMock(JiraApiService::class);
        $jiraApiService
            ->method('syncWorkLog')
            ->willReturnCallback(
                static function (
                    Task $syncedTask,
                    ?int $workLogId,
                    \DateTime $startTime,
                    int $seconds,
                    ?string $description,
                ) use ($task, $workLog, &$jiraStart, &$timeSpentSeconds): Worklog {
                    self::assertSame($task, $syncedTask);
                    self::assertNull($workLogId);
                    self::assertSame('', $description);
                    $jiraStart = $startTime->format(\DateTimeInterface::ATOM);
                    $timeSpentSeconds = $seconds;

                    return $workLog;
                }
            );

        $result = $this->createService(
            userTimezone: $userTimezone,
            jiraApiService: $jiraApiService,
            task: $task,
            jiraWorkLogRepository: $jiraWorkLogRepository,
        )->syncTask('task-id', $date);

        self::assertSame(TaskSyncStatus::Synced, $result->status);
        self::assertIsString($identity);
        self::assertIsString($jiraStart);
        self::assertIsInt($timeSpentSeconds);

        return [
            'identity' => $identity,
            'jiraStart' => $jiraStart,
            'timeSpentSeconds' => $timeSpentSeconds,
        ];
    }

    private function createService(
        string $userTimezone = 'UTC',
        ?JiraApiService $jiraApiService = null,
        ?Task $task = null,
        ?JiraWorkLogRepository $jiraWorkLogRepository = null,
        ?TaskFilterDateRangeResolver $dateRangeResolver = null,
        array $allTasks = [],
    ): JiraTaskSyncService {
        $taskRepository = $this->createMock(TaskRepository::class);
        $taskRepository->method('find')->willReturn($task);
        $taskRepository->method('findAll')->willReturn($allTasks);
        $userTimezoneResolver = $this->createMock(UserTimezoneResolver::class);
        $userTimezoneResolver
            ->method('resolveCurrentUserTimezone')
            ->willReturn($userTimezone);

        return new JiraTaskSyncService(
            $jiraApiService ?? $this->createMock(JiraApiService::class),
            $jiraWorkLogRepository ?? $this->jiraWorkLogRepository(),
            $dateRangeResolver ?? new TaskFilterDateRangeResolver(
                $userTimezoneResolver,
                new DateInputParser($userTimezoneResolver, 'UTC')
            ),
            $userTimezoneResolver,
            $taskRepository,
        );
    }

    private function jiraWorkLogRepository(?EntityManagerInterface $entityManager = null): JiraWorkLogRepository
    {
        $entityManager ??= $this->createMock(EntityManagerInterface::class);
        $repository = $this->getMockBuilder(JiraWorkLogRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findOneBy', 'getEntityManager'])
            ->getMock();
        $repository->method('findOneBy')->willReturn(null);
        $repository->method('getEntityManager')->willReturn($entityManager);

        return $repository;
    }

    private function workLog(): Worklog
    {
        $workLog = new Worklog();
        $workLog->id = 123;

        return $workLog;
    }
}
