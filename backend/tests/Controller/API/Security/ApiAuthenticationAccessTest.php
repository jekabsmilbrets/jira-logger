<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\Security;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class ApiAuthenticationAccessTest extends WebTestCase
{
    public function testAnonymousCannotSyncTaskWithJira(): void
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/task/123e4567-e89b-12d3-a456-426614174000/2026-01-01'
        );

        self::assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }
}
