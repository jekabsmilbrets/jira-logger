<?php

declare(strict_types=1);

namespace App\Tests\Service\DateTime;

use App\Entity\Setting\Setting;
use App\Repository\Setting\SettingRepository;
use App\Service\DateTime\UserTimezoneResolver;
use App\Service\Setting\SettingService;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class UserTimezoneResolverTest extends TestCase
{
    public function testReturnsConfiguredJiraUserTimezoneWhenValid(): void
    {
        $setting = (new Setting())
            ->setName('jira.user-time-zone')
            ->setValue('Europe/Riga');

        $settingRepository = $this->getMockBuilder(SettingRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findOneBy'])
            ->getMock();
        $settingRepository
            ->method('findOneBy')
            ->with(['name' => 'jira.user-time-zone'])
            ->willReturn($setting);
        $settingService = new SettingService($settingRepository);

        $logger = $this->createMock(LoggerInterface::class);
        $logger->expects(self::never())->method('warning');

        $resolver = new UserTimezoneResolver($settingService, $logger, 'UTC');

        self::assertSame('Europe/Riga', $resolver->resolveCurrentUserTimezone());
    }

    public function testFallsBackToDefaultTimezoneWhenMissingOrInvalid(): void
    {
        $setting = (new Setting())
            ->setName('jira.user-time-zone')
            ->setValue('Invalid/Zone');

        $settingRepository = $this->getMockBuilder(SettingRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findOneBy'])
            ->getMock();
        $settingRepository
            ->method('findOneBy')
            ->with(['name' => 'jira.user-time-zone'])
            ->willReturn($setting);
        $settingService = new SettingService($settingRepository);

        $logger = $this->createMock(LoggerInterface::class);
        $logger->expects(self::once())->method('warning');

        $resolver = new UserTimezoneResolver($settingService, $logger, 'UTC');

        self::assertSame('UTC', $resolver->resolveCurrentUserTimezone());
    }
}
