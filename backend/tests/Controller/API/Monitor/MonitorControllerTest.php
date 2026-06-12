<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\Monitor;

use App\Controller\API\Monitor\MonitorController;
use App\Service\DateTime\UserTimezoneResolver;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;

class MonitorControllerTest extends TestCase
{
    public function testMonitorReturnsWelcomePayload(): void
    {
        $controller = new MonitorController();
        $controller->setContainer(new Container());
        $resolver = $this->createMock(UserTimezoneResolver::class);
        $resolver->method('resolveCurrentUserTimezone')->willReturn('Europe/Riga');
        $controller->setUserTimezoneResolver($resolver);

        $response = $controller->monitor();
        $payload = json_decode((string) $response->getContent(), true);

        self::assertSame(200, $response->getStatusCode());
        self::assertSame('Welcome to Jira-logger API!', $payload['data']['message']);
        self::assertMatchesRegularExpression(
            '/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\+03:00$/',
            $payload['data']['time']
        );
    }
}
