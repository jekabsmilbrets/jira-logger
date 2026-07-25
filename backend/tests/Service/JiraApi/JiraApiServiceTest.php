<?php

declare(strict_types=1);

namespace App\Tests\Service\JiraApi;

use App\Entity\Setting\Setting;
use App\Entity\Task\Task;
use App\Exception\JiraApiServiceException;
use App\Repository\Setting\SettingRepository;
use App\Service\JiraApi\JiraApiService;
use App\Service\Setting\SettingService;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class JiraApiServiceTest extends TestCase
{
    public function testSyncWorkLogRejectsValuesBelowMinimumThresholdAfterConfiguration(): void
    {
        $settingRepository = $this->createMock(SettingRepository::class);
        $settings = [
            JiraApiService::JIRA_ENABLED_KEY => (new Setting())->setName(JiraApiService::JIRA_ENABLED_KEY)->setValue('true'),
            JiraApiService::JIRA_HOST_SETTING_KEY => (new Setting())->setName(JiraApiService::JIRA_HOST_SETTING_KEY)->setValue('https://jira.example.test'),
            JiraApiService::JIRA_PERSONAL_ACCESS_TOKEN_SETTING_KEY => (new Setting())->setName(JiraApiService::JIRA_PERSONAL_ACCESS_TOKEN_SETTING_KEY)->setValue('token'),
        ];
        $settingRepository
            ->method('findOneBy')
            ->willReturnCallback(static fn (array $criteria): ?Setting => $settings[$criteria['name']] ?? null);

        $this->expectException(JiraApiServiceException::class);
        $this->expectExceptionMessage('Cannot report less than 60 second!');

        (new JiraApiService(
            $this->createMock(LoggerInterface::class),
            new SettingService($settingRepository),
        ))->syncWorkLog(
            task: (new Task())->setName('TASK-1'),
            workLogId: null,
            startTime: new \DateTime('2026-05-30 10:00:00'),
            timeSpentSeconds: 59,
        );
    }
}
