<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\Monitor;

use App\Controller\API\Monitor\MonitorController;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;

class MonitorControllerTest extends TestCase
{
    public function testMonitorReturnsWelcomePayload(): void
    {
        $controller = new MonitorController();
        $controller->setContainer(new Container());

        $response = $controller->monitor();

        self::assertSame(200, $response->getStatusCode());
        self::assertStringContainsString('Welcome to Jira-logger API!', (string) $response->getContent());
    }
}
