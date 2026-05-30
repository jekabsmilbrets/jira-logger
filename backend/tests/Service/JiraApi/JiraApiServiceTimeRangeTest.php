<?php

declare(strict_types=1);

namespace App\Tests\Service\JiraApi;

use App\Entity\Task\TimeLog\TimeLog;
use App\Exception\JiraApiServiceException;
use App\Service\JiraApi\JiraApiService;
use App\Service\JiraWorkLog\JiraWorkLogService;
use App\Service\Setting\SettingService;
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
        $method->setAccessible(true);

        [$seconds, $descriptions] = $method->invoke(
            $service,
            new ArrayCollection([$timeLog]),
            $rangeStart,
            $rangeEnd,
        );

        self::assertSame(86399, $seconds);
        self::assertSame(['Long task'], $descriptions);
        self::assertSame('2026-05-29T10:00:00+00:00', (clone $timeLog->getStartTime())->setTimezone(new \DateTimeZone('UTC'))->format(\DateTimeInterface::ATOM));
        self::assertSame('2026-05-31T10:00:00+00:00', (clone $timeLog->getEndTime())->setTimezone(new \DateTimeZone('UTC'))->format(\DateTimeInterface::ATOM));
    }

    public function testFilterIncludesTimeLogSpanningWholeRequestedRange(): void
    {
        $service = $this->createService();

        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTime('2026-05-29 00:00:00'))
            ->setEndTime(new \DateTime('2026-05-31 00:00:00'));

        $method = new \ReflectionMethod(JiraApiService::class, 'filterTimeLogsInDateRange');
        $method->setAccessible(true);

        $result = $method->invoke(
            $service,
            new ArrayCollection([$timeLog]),
            new \DateTime('2026-05-30 00:00:00'),
            new \DateTime('2026-05-30 23:59:59'),
        );

        self::assertCount(1, $result);
    }

    public function testResolveSyncDatesKeepsCanonicalMidnightAndDoesNotMutateInputDate(): void
    {
        $service = $this->createService();
        $inputDate = new \DateTime('2026-05-30 11:12:13');

        $method = new \ReflectionMethod(JiraApiService::class, 'resolveSyncDates');
        $method->setAccessible(true);
        [$syncDate, $startDate, $endDate, $jiraStartDateTime] = $method->invoke($service, $inputDate);

        self::assertSame('2026-05-30 11:12:13', $inputDate->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 00:00:00', $syncDate->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 00:00:00', $startDate->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 23:59:59', $endDate->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 17:00:00', $jiraStartDateTime->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 00:00:00', $syncDate->format('Y-m-d H:i:s'));
    }

    public function testCalculateSingleTimeLogSecondsRejectsValuesBelowMinimumThreshold(): void
    {
        $service = $this->createService();
        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-05-30 10:00:00'))
            ->setEndTime(new \DateTimeImmutable('2026-05-30 10:00:59'));

        $method = new \ReflectionMethod(JiraApiService::class, 'calculateTimeSpentInSecondsSingleTimeLog');
        $method->setAccessible(true);

        $this->expectException(JiraApiServiceException::class);
        $this->expectExceptionMessage('Cannot report less than 60 second!');

        $method->invoke($service, $timeLog);
    }

    private function createService(): JiraApiService
    {
        return new JiraApiService(
            $this->createMock(LoggerInterface::class),
            $this->createMock(SettingService::class),
            $this->createMock(JiraWorkLogService::class),
        );
    }
}
