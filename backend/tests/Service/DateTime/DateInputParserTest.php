<?php

declare(strict_types=1);

namespace App\Tests\Service\DateTime;

use App\Service\DateTime\DateInputParser;
use App\Service\DateTime\UserTimezoneResolver;
use PHPUnit\Framework\TestCase;

class DateInputParserTest extends TestCase
{
    private DateInputParser $parser;

    protected function setUp(): void
    {
        $timezoneResolver = $this->createMock(UserTimezoneResolver::class);
        $timezoneResolver
            ->method('resolveCurrentUserTimezone')
            ->willReturn('Europe/Riga');

        $this->parser = new DateInputParser($timezoneResolver);
    }

    public function testParsesUnixSeconds(): void
    {
        self::assertSame('2025-01-01', $this->parser->parseDate('1735689600'));
    }

    public function testParsesUnixMilliseconds(): void
    {
        self::assertSame('2025-01-01 02:00:00', $this->parser->parseDateTime('1735689600000'));
    }

    public function testParsesIsoDateTimeWithTimezone(): void
    {
        self::assertSame('2026-05-31 17:30:45', $this->parser->parseDateTime('2026-05-31T14:30:45Z'));
    }

    public function testParsesNaiveDateTimeUsingResolvedTimezone(): void
    {
        self::assertSame('2026-05-31 14:30:45', $this->parser->parseDateTime('2026-05-31 14:30:45'));
    }

    public function testParsesEuSlashDate(): void
    {
        self::assertSame('2026-05-31', $this->parser->parseDate('31/05/2026'));
    }

    public function testThrowsOnInvalidInput(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->parser->parseDate('not-a-date');
    }
}

