<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\Task;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class TaskWorkflowSecurityTest extends WebTestCase
{
    public function testAnonymousCannotStartTaskTimer(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/task/1/time-log/start');

        self::assertResponseStatusCodeSame(401);
    }

    public function testAnonymousCannotStopTaskTimer(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/task/1/time-log/stop');

        self::assertResponseStatusCodeSame(401);
    }

    public function testAnonymousCannotSyncTaskToJira(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/task/1/2026-05-30');

        self::assertResponseStatusCodeSame(401);
    }
}
