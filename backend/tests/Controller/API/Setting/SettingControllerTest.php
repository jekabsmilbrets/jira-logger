<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\Setting;

use App\Controller\API\Setting\SettingController;
use App\Dto\Setting\SettingRequest;
use App\Entity\Setting\Setting;
use App\Repository\Setting\SettingRepository;
use App\Service\Setting\SettingService;
use App\Tests\Support\EntityIdSetter;
use App\Utility\Constants\Group;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Serializer\Mapping\Factory\ClassMetadataFactory;
use Symfony\Component\Serializer\Mapping\Loader\AttributeLoader;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;
use Symfony\Component\Serializer\Normalizer\ObjectNormalizer;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\ConstraintViolationList;
use Symfony\Component\Validator\Validator\ValidatorInterface;

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

    /**
     * @dataProvider redactedWriteMethods
     */
    public function testRedactedValuesAreRejectedAsBadRequests(string $method): void
    {
        $repository = $this->getMockBuilder(SettingRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['find'])
            ->getMock();
        $repository
            ->method('find')
            ->willReturn((new Setting())->setName('jira-token')->setValue('stored-secret'));
        $controller = new SettingController(new SettingService($repository));
        $controller->setContainer(new Container());
        $serializer = $this->createMock(SerializerInterface::class);
        $serializer
            ->method('deserialize')
            ->willReturn(
                (new SettingRequest())
                    ->setName('jira-token')
                    ->setValue(SettingService::REDACTED_VALUE),
            );
        $validator = $this->createMock(ValidatorInterface::class);
        $validator->method('validate')->willReturn(new ConstraintViolationList());

        $response = 'create' === $method
            ? $controller->new($validator, $serializer, new Request(content: '{}'))
            : $controller->edit('setting-id', $validator, $serializer, new Request(content: '{}'));

        self::assertSame(400, $response->getStatusCode());
        self::assertStringContainsString(
            SettingService::REDACTED_VALUE_NOT_WRITABLE,
            (string) $response->getContent(),
        );
    }

    public static function redactedWriteMethods(): iterable
    {
        yield from [
            ['create'],
            ['update'],
        ];
    }

    public function testSerializationCannotExposeRawSettingValue(): void
    {
        $setting = (new Setting())->setName('jira-token')->setValue('raw-secret');
        $this->setEntityId($setting, 'setting-id');
        $normalizer = new ObjectNormalizer(
            new ClassMetadataFactory(new AttributeLoader()),
        );

        $defaultData = $normalizer->normalize($setting);
        $listData = $normalizer->normalize(
            $setting,
            context: [AbstractNormalizer::GROUPS => [Group::LIST]],
        );

        self::assertIsArray($defaultData);
        self::assertArrayNotHasKey('value', $defaultData);
        self::assertIsArray($listData);
        self::assertSame('jira-token', $listData['name'] ?? null);
        self::assertArrayNotHasKey('value', $listData);
    }
}
