<?php

declare(strict_types=1);

namespace App\Tests\Controller\API;

use App\Controller\API\BaseApiController;
use App\Controller\API\JiraWorkLog\JiraWorkLogController;
use App\Controller\API\Monitor\MonitorController;
use App\Controller\API\Setting\SettingController;
use App\Controller\API\Tag\TagController;
use App\Controller\API\Task\TaskController;
use App\Controller\API\Task\TimeLog\TimeLogController;
use App\Controller\Web\Angular\AngularController;
use App\Service\DateTime\UserTimezoneResolver;
use ReflectionException;
use ReflectionProperty;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class BaseApiControllerWiringTest extends KernelTestCase
{
    public function testApiControllersReceiveUserTimezoneResolver(): void
    {
        self::bootKernel();

        $controller = static::getContainer()->get(MonitorController::class);
        $property = new ReflectionProperty(BaseApiController::class, 'userTimezoneResolver');
        $resolver = $property->getValue($controller);

        self::assertInstanceOf(UserTimezoneResolver::class, $resolver);
    }

    /**
     * @dataProvider apiControllerProvider
     */
    public function testApiControllersReceiveContainerAndTimezoneResolver(string $controllerClass): void
    {
        self::bootKernel();

        $controller = static::getContainer()->get($controllerClass);

        $containerProperty = new ReflectionProperty(AbstractController::class, 'container');
        $resolverProperty = new ReflectionProperty(BaseApiController::class, 'userTimezoneResolver');

        self::assertNotNull($containerProperty->getValue($controller));
        self::assertInstanceOf(
            UserTimezoneResolver::class,
            $resolverProperty->getValue($controller)
        );
    }

    public function testWebControllerDoesNotExposeApiTimezoneResolverWiring(): void
    {
        self::bootKernel();

        $controller = static::getContainer()->get(AngularController::class);
        $containerProperty = new ReflectionProperty(AbstractController::class, 'container');

        self::assertNotNull($containerProperty->getValue($controller));
        self::assertFalse(method_exists($controller, 'setUserTimezoneResolver'));

        try {
            new ReflectionProperty($controller, 'userTimezoneResolver');
            self::fail('AngularController should not define API timezone resolver state.');
        } catch (ReflectionException) {
            self::assertTrue(true);
        }
    }

    public static function apiControllerProvider(): array
    {
        return [
            [MonitorController::class],
            [SettingController::class],
            [TagController::class],
            [TaskController::class],
            [TimeLogController::class],
            [JiraWorkLogController::class],
        ];
    }
}
