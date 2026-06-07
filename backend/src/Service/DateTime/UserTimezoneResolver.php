<?php

declare(strict_types=1);

namespace App\Service\DateTime;

use App\Service\Setting\SettingService;
use DateTimeZone;
use Psr\Log\LoggerInterface;

class UserTimezoneResolver
{
    private const JIRA_USER_TIMEZONE_SETTING_NAME = 'jira.user-time-zone';

    public function __construct(
        private readonly SettingService $settingService,
        private readonly LoggerInterface $logger,
        private readonly string $defaultTimezone,
    ) {
    }

    public function resolveCurrentUserTimezone(): string
    {
        $setting = $this->settingService->findByName(self::JIRA_USER_TIMEZONE_SETTING_NAME);
        $value = $setting?->getValue();

        if (\is_string($value) && '' !== trim($value) && $this->isValidTimezone($value)) {
            return $value;
        }

        $this->logger->warning(
            'User timezone setting missing or invalid. Falling back to default timezone.',
            [
                'settingName' => self::JIRA_USER_TIMEZONE_SETTING_NAME,
                'fallbackTimezone' => $this->defaultTimezone,
            ]
        );

        return $this->defaultTimezone;
    }

    private function isValidTimezone(string $timezone): bool
    {
        try {
            new DateTimeZone($timezone);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }
}
