<?php

declare(strict_types=1);

namespace App\Tests\Controller\Web\Angular;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class AngularControllerTest extends WebTestCase
{
    public function testIndexRouteReturnsServerErrorWhenAngularBuildIsMissing(): void
    {
        $client = static::createClient();
        $client->request('GET', '/');

        self::assertResponseStatusCodeSame(500);
    }
}
