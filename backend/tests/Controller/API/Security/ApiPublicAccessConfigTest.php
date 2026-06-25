<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\Security;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Yaml\Yaml;

class ApiPublicAccessConfigTest extends TestCase
{
    public function testApiRoutesArePublicAccess(): void
    {
        $config = Yaml::parseFile(__DIR__ . '/../../../../config/packages/security.yaml');
        $accessControl = $config['security']['access_control'] ?? [];

        self::assertContains(['path' => '^/api/monitor', 'roles' => 'PUBLIC_ACCESS'], $accessControl);
        self::assertContains(['path' => '^/api', 'roles' => 'PUBLIC_ACCESS'], $accessControl);
    }
}
