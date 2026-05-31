<?php

declare(strict_types=1);

namespace App\Tests\Dto\Setting;

use App\Dto\Setting\SettingRequest;
use PHPUnit\Framework\TestCase;

class SettingRequestTest extends TestCase
{
    public function testNameAndValueRoundTrip(): void
    {
        $request = (new SettingRequest())
            ->setName('jira-host')
            ->setValue('https://jira.example');

        self::assertSame('jira-host', $request->getName());
        self::assertSame('https://jira.example', $request->getValue());
    }
}
