<?php

declare(strict_types=1);

namespace App\Tests\Service\DateTime;

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

        return new TaskFilterDateRangeResolver($timezoneResolver);
    }

    public function testResolveReturnsNullWithoutDateFilters(): void
    {
        $resolver = $this->createResolver();

        self::assertNull($resolver->resolve([]));
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
}
