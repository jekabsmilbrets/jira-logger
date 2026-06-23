<?php

declare(strict_types=1);

namespace App\Tests\Service\JiraApi;

use App\Entity\Setting\Setting;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Exception\JiraApiServiceException;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\DateTime\UserTimezoneResolver;
use App\Service\JiraApi\JiraApiService;
use App\Service\JiraWorkLog\JiraWorkLogService;
use App\Service\Setting\SettingService;
use App\Service\Task\JiraSync\TaskJiraSyncException;
use App\Repository\Setting\SettingRepository;
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class JiraApiServiceTimeRangeTest extends TestCase
{
    public function testCalculateTimeSpentUsesClippedIntervalsWithoutMutatingTimeLog(): void
    {
        $service = $this->createService();

        $start = new \DateTime('2026-05-29 10:00:00');
        $end = new \DateTime('2026-05-31 10:00:00');

        $timeLog = (new TimeLog())
            ->setStartTime($start)
            ->setEndTime($end)
            ->setDescription('Long task');

        $rangeStart = new \DateTime('2026-05-30 00:00:00');
        $rangeEnd = new \DateTime('2026-05-30 23:59:59');

        $method = new \ReflectionMethod(JiraApiService::class, 'calculateTimeSpentInSecondsCollectDescriptionsInTimeLogsCollection');

        [$seconds, $descriptions] = $method->invoke(
            $service,
            new ArrayCollection([$timeLog]),
            $rangeStart,
            $rangeEnd,
        );

        self::assertSame(86399, $seconds);
        self::assertSame(['Long task'], $descriptions);
        self::assertSame('2026-05-29 10:00:00', $timeLog->getStartTime()?->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-31 10:00:00', $timeLog->getEndTime()?->format('Y-m-d H:i:s'));
    }

    public function testFilterIncludesTimeLogSpanningWholeRequestedRange(): void
    {
        $service = $this->createService();

        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTime('2026-05-29 00:00:00'))
            ->setEndTime(new \DateTime('2026-05-31 00:00:00'));

        $method = new \ReflectionMethod(JiraApiService::class, 'filterTimeLogsInDateRange');

        $result = $method->invoke(
            $service,
            new ArrayCollection([$timeLog]),
            new \DateTime('2026-05-30 00:00:00'),
            new \DateTime('2026-05-30 23:59:59'),
        );

        self::assertCount(1, $result);
    }

    public function testResolveSyncDatesKeepsCanonicalMidnightAndJiraAnchor(): void
    {
        $service = $this->createService();

        $method = new \ReflectionMethod(JiraApiService::class, 'resolveSyncDates');
        [$syncDate, $startDate, $endDate, $jiraStartDateTime] = $method->invoke($service, '2026-05-30');

        self::assertSame('2026-05-30 00:00:00', $syncDate->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 00:00:00', $startDate->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 23:59:59', $endDate->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 17:00:00', $jiraStartDateTime->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 00:00:00', $syncDate->format('Y-m-d H:i:s'));
    }

    public function testResolveSyncDatesUsesUserTimezoneForDateModeRange(): void
    {
        $service = $this->createService('Europe/Vienna');
        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-06-23T00:00:00+02:00'))
            ->setEndTime(new \DateTimeImmutable('2026-06-23T00:10:00+02:00'));

        $resolveMethod = new \ReflectionMethod(JiraApiService::class, 'resolveSyncDates');
        [$syncDate, $startDate, $endDate, $jiraStartDateTime] = $resolveMethod->invoke($service, '2026-06-23');

        self::assertSame('2026-06-23', $syncDate->format('Y-m-d'));
        self::assertSame('2026-06-23 17:00:00', $jiraStartDateTime->format('Y-m-d H:i:s'));
        self::assertSame('2026-06-22T22:00:00+00:00', $startDate->format(\DateTimeInterface::ATOM));
        self::assertSame('2026-06-23T21:59:59+00:00', $endDate->format(\DateTimeInterface::ATOM));

        $calculateMethod = new \ReflectionMethod(JiraApiService::class, 'calculateTimeSpentInSecondsCollectDescriptionsInTimeLogsCollection');
        [$seconds] = $calculateMethod->invoke(
            $service,
            new ArrayCollection([$timeLog]),
            $startDate,
            $endDate,
        );

        self::assertSame(600, $seconds);
    }

    public function testCalculateSingleTimeLogSecondsRejectsValuesBelowMinimumThreshold(): void
    {
        $service = $this->createService();
        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-05-30 10:00:00'))
            ->setEndTime(new \DateTimeImmutable('2026-05-30 10:00:59'));

        $method = new \ReflectionMethod(JiraApiService::class, 'calculateTimeSpentInSecondsSingleTimeLog');

        $this->expectException(JiraApiServiceException::class);
        $this->expectExceptionMessage('Cannot report less than 60 second!');

        $method->invoke($service, $timeLog);
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

    private function createService(string $userTimezone = 'UTC', ?SettingService $settingService = null): JiraApiService
    {
        $userTimezoneResolver = $this->createMock(UserTimezoneResolver::class);
        $userTimezoneResolver
            ->method('resolveCurrentUserTimezone')
            ->willReturn($userTimezone);

        return new JiraApiService(
            $this->createMock(LoggerInterface::class),
            $settingService ?? $this->createMock(SettingService::class),
            $this->createMock(JiraWorkLogService::class),
            new TaskFilterDateRangeResolver($userTimezoneResolver),
        );
    }
}
