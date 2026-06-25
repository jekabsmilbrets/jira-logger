<?php

declare(strict_types=1);

namespace App\Tests\Service\DateTime;

use App\Service\DateTime\DateInputParser;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\DateTime\UserTimezoneResolver;
use PHPUnit\Framework\TestCase;

class TaskFilterDateRangeResolverTest extends TestCase
{
    private function createResolver(string $timezone = 'Europe/Riga'): TaskFilterDateRangeResolver
    {
        $timezoneResolver = $this->createMock(UserTimezoneResolver::class);
        $timezoneResolver
            ->method('resolveCurrentUserTimezone')
            ->willReturn($timezone);

        return new TaskFilterDateRangeResolver(
            $timezoneResolver,
            new DateInputParser($timezoneResolver, 'UTC')
        );
    }

    public function testResolveReturnsNullWithoutDateFilters(): void
    {
        $resolver = $this->createResolver();

        self::assertNull($resolver->resolve([]));
        self::assertNull($resolver->resolveTaskFilter([]));
    }

    public function testResolveUsesEndOfDayForSingleDateFilter(): void
    {
        $resolver = $this->createResolver('Europe/Vienna');

        $range = $resolver->resolve([
            'date' => '2026-06-06',
        ]);

        self::assertNotNull($range);
        self::assertSame('UTC', $range['startDate']->getTimezone()->getName());
        self::assertSame('2026-06-05 22:00:00', $range['startDate']->format('Y-m-d H:i:s'));
        self::assertSame('2026-06-06 21:59:59', $range['endDate']->format('Y-m-d H:i:s'));
    }

    public function testResolveUsesUserTimezoneForTimestampRange(): void
    {
        $resolver = $this->createResolver('Europe/Riga');

        $range = $resolver->resolve([
            'startDate' => '2026-06-02 00:00:00',
            'endDate' => '2026-06-03',
        ]);

        self::assertNotNull($range);
        self::assertSame('UTC', $range['startDate']->getTimezone()->getName());
        self::assertSame('2026-06-01 21:00:00', $range['startDate']->format('Y-m-d H:i:s'));
        self::assertSame('2026-06-03 20:59:59', $range['endDate']->format('Y-m-d H:i:s'));
    }

    public function testResolveUsesEndOfDayForDateOnlyRangeFilters(): void
    {
        $resolver = $this->createResolver('Europe/Vienna');

        $range = $resolver->resolve([
            'startDate' => '2026-06-05',
            'endDate' => '2026-06-06',
        ]);

        self::assertNotNull($range);
        self::assertSame('UTC', $range['startDate']->getTimezone()->getName());
        self::assertSame('2026-06-04 22:00:00', $range['startDate']->format('Y-m-d H:i:s'));
        self::assertSame('2026-06-06 21:59:59', $range['endDate']->format('Y-m-d H:i:s'));
    }

    public function testResolveNormalizesFlexibleRawFilterInputs(): void
    {
        $resolver = $this->createResolver('Europe/Riga');

        $range = $resolver->resolve([
            'startDate' => '2026-05-31T14:30:45Z',
            'endDate' => '31/05/2026',
        ]);

        self::assertNotNull($range);
        self::assertSame('2026-05-31 14:30:45', $range['startDate']->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-31 20:59:59', $range['endDate']->format('Y-m-d H:i:s'));
    }

    public function testResolveJiraSyncDateKeepsCanonicalMidnightAndJiraAnchor(): void
    {
        $syncDates = $this->createResolver('UTC')->resolveJiraSyncDate('2026-05-30');

        self::assertSame('2026-05-30 00:00:00', $syncDates['syncDate']->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 00:00:00', $syncDates['startDate']->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 23:59:59', $syncDates['endDate']->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 17:00:00', $syncDates['jiraStartDateTime']->format('Y-m-d H:i:s'));
    }

    public function testResolveJiraSyncDateUsesUserTimezoneForDateModeRange(): void
    {
        $syncDates = $this->createResolver('Europe/Vienna')->resolveJiraSyncDate('2026-06-23');

        self::assertSame('2026-06-23', $syncDates['syncDate']->format('Y-m-d'));
        self::assertSame('2026-06-23 17:00:00', $syncDates['jiraStartDateTime']->format('Y-m-d H:i:s'));
        self::assertSame('2026-06-22T22:00:00+00:00', $syncDates['startDate']->format(\DateTimeInterface::ATOM));
        self::assertSame('2026-06-23T21:59:59+00:00', $syncDates['endDate']->format(\DateTimeInterface::ATOM));
    }
}
