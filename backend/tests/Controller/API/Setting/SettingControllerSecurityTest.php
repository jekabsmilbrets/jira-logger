<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\Setting;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class SettingControllerSecurityTest extends WebTestCase
{
    public function testAnonymousCannotListSettings(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/setting');

        self::assertResponseStatusCodeSame(401);
    }

    public function testAnonymousCannotCreateSetting(): void
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/setting',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'name' => 'jira.personal-access-token',
                'value' => 'super-secret-token',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(401);
    }
}
