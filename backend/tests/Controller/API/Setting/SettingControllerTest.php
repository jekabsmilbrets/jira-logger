<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\Setting;

use App\Controller\API\Setting\SettingController;
use App\Entity\Setting\Setting;
use App\Repository\Setting\SettingRepository;
use App\Service\Setting\SettingService;
use App\Tests\Support\EntityIdSetter;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;

class SettingControllerTest extends TestCase
{
    use EntityIdSetter;

    /**
     * @dataProvider responseValues
     */
    public function testShowPreservesResponseShapeAndRedactsSecrets(
        string $name,
        string $value,
        string $expected,
    ): void {
        $setting = (new Setting())->setName($name)->setValue($value);
        $this->setEntityId($setting, '123e4567-e89b-12d3-a456-426614174000');
        $repository = $this->getMockBuilder(SettingRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['find'])
            ->getMock();
        $repository->method('find')->with('setting-id')->willReturn($setting);
        $controller = new SettingController(new SettingService($repository));
        $controller->setContainer(new Container());

        $response = $controller->show('setting-id');

        self::assertSame(200, $response->getStatusCode());
        self::assertSame(
            [
                'data' => [
                    'id' => '123e4567-e89b-12d3-a456-426614174000',
                    'name' => $name,
                    'value' => $expected,
                ],
            ],
            json_decode((string) $response->getContent(), true, flags: \JSON_THROW_ON_ERROR),
        );
    }

    public static function responseValues(): iterable
    {
        yield from [
            ['jira-host', 'https://jira.example', 'https://jira.example'],
            ['JIRA_PERSONAL_ACCESS_TOKEN', 'sensitive', '***REDACTED***'],
        ];
    }
}
