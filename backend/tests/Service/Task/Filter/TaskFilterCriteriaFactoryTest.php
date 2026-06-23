<?php

declare(strict_types=1);

namespace App\Tests\Service\Task\Filter;

use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\Task\Filter\TaskFilterCriteriaFactory;
use PHPUnit\Framework\TestCase;

class TaskFilterCriteriaFactoryTest extends TestCase
{
    public function testCreateNormalizesFilterIntent(): void
    {
        $dateRange = [
            'startDate' => new \DateTimeImmutable('2026-06-01 00:00:00'),
            'endDate' => new \DateTimeImmutable('2026-06-01 23:59:59'),
        ];
        $resolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $resolver
            ->expects(self::once())
            ->method('resolve')
            ->with([
                'tags' => '550e8400-e29b-41d4-a716-446655440000, invalid',
                'name' => ' backend ',
                'date' => '2026-06-01',
                'hideUnreported' => 'true',
            ])
            ->willReturn($dateRange);

        $criteria = (new TaskFilterCriteriaFactory($resolver))->create([
            'tags' => '550e8400-e29b-41d4-a716-446655440000, invalid',
            'name' => ' backend ',
            'date' => '2026-06-01',
            'hideUnreported' => 'true',
        ]);

        self::assertSame(['550e8400-e29b-41d4-a716-446655440000'], $criteria->tagIds);
        self::assertSame('backend', $criteria->name);
        self::assertSame($dateRange, $criteria->dateRange);
        self::assertTrue($criteria->hideUnreported);
        self::assertTrue($criteria->hasQueryFilters());
    }

    public function testCreateEmptyFilterHasNoQueryFilters(): void
    {
        $resolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $resolver->expects(self::never())->method('resolve');

        $criteria = (new TaskFilterCriteriaFactory($resolver))->create(null);

        self::assertSame([], $criteria->tagIds);
        self::assertNull($criteria->name);
        self::assertNull($criteria->dateRange);
        self::assertFalse($criteria->hideUnreported);
        self::assertFalse($criteria->hasQueryFilters());
    }
}
