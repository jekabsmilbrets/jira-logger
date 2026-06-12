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
        $this->parser = $this->createParser();
    }

    private function createParser(string $userTimezone = 'Europe/Riga', string $internalTimezone = 'UTC'): DateInputParser
    {
        $timezoneResolver = $this->createMock(UserTimezoneResolver::class);
        $timezoneResolver
            ->method('resolveCurrentUserTimezone')
            ->willReturn($userTimezone);

        return new DateInputParser($timezoneResolver, $internalTimezone);
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

    public function testParseDateTimeObjectPreservesInstantAndConvertsToInternalTimezone(): void
    {
        $parser = $this->createParser('Europe/Vienna', 'UTC');

        $parsed = $parser->parseDateTimeObject('1780434000000');

        self::assertNotNull($parsed);
        self::assertSame('2026-06-02T21:00:00+00:00', $parsed->format(\DateTimeInterface::ATOM));
    }

    public function testParseDateTimeObjectInterpretsNaiveDateTimeInUserTimezone(): void
    {
        $parser = $this->createParser('Europe/Vienna', 'UTC');

        $parsed = $parser->parseDateTimeObject('2026-06-03 23:59:00');

        self::assertNotNull($parsed);
        self::assertSame('2026-06-03T21:59:00+00:00', $parsed->format(\DateTimeInterface::ATOM));
    }

    public function testThrowsOnInvalidInput(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->parser->parseDate('not-a-date');
    }
}
