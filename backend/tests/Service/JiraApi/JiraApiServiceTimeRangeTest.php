<?php

declare(strict_types=1);

namespace App\Tests\Service\JiraApi;

use App\Entity\Setting\Setting;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Exception\JiraApiServiceException;
use App\Repository\JiraWorkLog\JiraWorkLogRepository;
use App\Repository\Setting\SettingRepository;
use App\Service\DateTime\DateInputParser;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\DateTime\UserTimezoneResolver;
use App\Service\JiraApi\JiraApiService;
use App\Service\Setting\SettingService;
use App\Service\Task\JiraSync\JiraTaskSyncService;
use App\Service\Task\JiraSync\TaskJiraSyncException;
use Doctrine\ORM\EntityManagerInterface;
use JiraRestApi\Issue\Worklog;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class JiraApiServiceTimeRangeTest extends TestCase
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

        $synced = $this->createService(jiraApiService: $jiraApiService)->syncTask($task, '2026-05-30');

        self::assertTrue($synced);
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

        self::assertTrue($this->createService(jiraApiService: $jiraApiService)->syncTask($task, '2026-05-30'));
    }

    public function testResolveSyncDatesUsesUserTimezoneForDateModeRange(): void
    {
        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-06-23T00:00:00+02:00'))
            ->setEndTime(new \DateTimeImmutable('2026-06-23T00:10:00+02:00'));
        $task = (new Task())->setName('TASK-1');
        $task->addTimeLog($timeLog);
        $jiraApiService = $this->createMock(JiraApiService::class);
        $jiraApiService
            ->expects(self::once())
            ->method('syncWorkLog')
            ->with($task, null, self::isInstanceOf(\DateTime::class), 600, '')
            ->willReturn($this->workLog());

        self::assertTrue($this->createService('Europe/Vienna', jiraApiService: $jiraApiService)->syncTask($task, '2026-06-23'));
    }

    public function testSyncWorkLogRejectsValuesBelowMinimumThresholdAfterConfiguration(): void
    {
        $settingRepository = $this->createMock(SettingRepository::class);
        $settings = [
            JiraApiService::JIRA_ENABLED_KEY => (new Setting())->setName(JiraApiService::JIRA_ENABLED_KEY)->setValue('true'),
            JiraApiService::JIRA_HOST_SETTING_KEY => (new Setting())->setName(JiraApiService::JIRA_HOST_SETTING_KEY)->setValue('https://jira.example.test'),
            JiraApiService::JIRA_PERSONAL_ACCESS_TOKEN_SETTING_KEY => (new Setting())->setName(JiraApiService::JIRA_PERSONAL_ACCESS_TOKEN_SETTING_KEY)->setValue('token'),
        ];
        $settingRepository
            ->method('findOneBy')
            ->willReturnCallback(static fn (array $criteria): ?Setting => $settings[$criteria['name']] ?? null);

        $this->expectException(JiraApiServiceException::class);
        $this->expectExceptionMessage('Cannot report less than 60 second!');

        $this->createApiService(new SettingService($settingRepository))->syncWorkLog(
            task: (new Task())->setName('TASK-1'),
            workLogId: null,
            startTime: new \DateTime('2026-05-30 10:00:00'),
            timeSpentSeconds: 59,
        );
    }

    public function testSyncTaskTranslatesJiraServiceFailureToTaskSyncFailure(): void
    {
        $settingRepository = $this->createMock(SettingRepository::class);
        $settingRepository
            ->method('findOneBy')
            ->with(['name' => JiraApiService::JIRA_ENABLED_KEY])
            ->willReturn((new Setting())->setName(JiraApiService::JIRA_ENABLED_KEY)->setValue('false'));

        $service = $this->createService(settingService: new SettingService($settingRepository));

        $this->expectException(TaskJiraSyncException::class);
        $this->expectExceptionMessage(JiraApiService::JIRA_DISABLED_MSG);

        $service->syncTask((new Task())->setName('TASK-1'), '2026-06-23');
    }

    private function createService(
        string $userTimezone = 'UTC',
        ?SettingService $settingService = null,
        ?JiraApiService $jiraApiService = null,
    ): JiraTaskSyncService
    {
        return new JiraTaskSyncService(
            $jiraApiService ?? $this->createApiService($settingService),
            $this->jiraWorkLogRepository(),
            $this->createDateRangeResolver($userTimezone),
        );
    }

    private function jiraWorkLogRepository(): JiraWorkLogRepository
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
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

    private function createDateRangeResolver(string $userTimezone = 'UTC'): TaskFilterDateRangeResolver
    {
        $userTimezoneResolver = $this->createMock(UserTimezoneResolver::class);
        $userTimezoneResolver
            ->method('resolveCurrentUserTimezone')
            ->willReturn($userTimezone);

        return new TaskFilterDateRangeResolver(
            $userTimezoneResolver,
            new DateInputParser($userTimezoneResolver, 'UTC')
        );
    }

    private function createApiService(?SettingService $settingService = null): JiraApiService
    {
        return new JiraApiService(
            $this->createMock(LoggerInterface::class),
            $settingService ?? $this->createMock(SettingService::class),
        );
    }
}
