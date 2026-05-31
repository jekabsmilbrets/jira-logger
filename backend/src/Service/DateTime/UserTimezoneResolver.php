<?php

declare(strict_types=1);

namespace App\Service\DateTime;

use App\Service\Setting\SettingService;
use DateTimeZone;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;

class UserTimezoneResolver
{
    public function __construct(
        private readonly SettingService $settingService,
        private readonly Security $security,
        private readonly LoggerInterface $logger,
        private readonly string $defaultTimezone,
    ) {
    }

    public function resolveCurrentUserTimezone(): string
    {
        $identifier = $this->resolveCurrentUserIdentifier();

        if (null !== $identifier) {
            $settingName = sprintf('user.%s.timezone', mb_strtolower($identifier));
            $setting = $this->settingService->findByName($settingName);
            $value = $setting?->getValue();

            if (\is_string($value) && '' !== trim($value) && $this->isValidTimezone($value)) {
                return $value;
            }

            $this->logger->warning(
                'User timezone setting missing or invalid. Falling back to default timezone.',
                [
                    'userIdentifier' => $identifier,
                    'settingName' => $settingName,
                    'fallbackTimezone' => $this->defaultTimezone,
                ]
            );
        }

        return $this->defaultTimezone;
    }

    private function resolveCurrentUserIdentifier(): ?string
    {
        $user = $this->security->getUser();

        if (null === $user) {
            return null;
        }

        if (\is_string($user) && '' !== trim($user)) {
            return trim($user);
        }

        if (\is_object($user) && method_exists($user, 'getUserIdentifier')) {
            $identifier = $user->getUserIdentifier();

            return \is_string($identifier) && '' !== trim($identifier) ? trim($identifier) : null;
        }

        if (\is_object($user) && method_exists($user, 'getUsername')) {
            $identifier = $user->getUsername();

            return \is_string($identifier) && '' !== trim($identifier) ? trim($identifier) : null;
        }

        return null;
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

