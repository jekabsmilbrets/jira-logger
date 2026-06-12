<?php

declare(strict_types=1);

namespace App\Tests\Factory\Setting;

use App\Dto\Setting\SettingRequest;
use App\Factory\Setting\SettingFactory;
use PHPUnit\Framework\TestCase;

class SettingFactoryTest extends TestCase
{
    public function testCreateBuildsNewSetting(): void
    {
        $request = (new SettingRequest())->setName('jira-host')->setValue('https://jira');

        $setting = SettingFactory::create($request);

        self::assertSame('jira-host', $setting->getName());
        self::assertSame('https://jira', $setting->getValue());
    }
}
