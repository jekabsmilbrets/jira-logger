<?php

declare(strict_types=1);

namespace App\Tests\Service\Setting;

use App\Dto\Setting\SettingRequest;
use App\Entity\Setting\Setting;
use App\Repository\Setting\SettingRepository;
use App\Service\Setting\SettingService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class SettingServiceTest extends TestCase
{
    public function testNewMapsRequestToSetting(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('persist');
        $repository = $this->getMockBuilder(SettingRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getEntityManager'])
            ->getMock();
        $repository->method('getEntityManager')->willReturn($entityManager);
        $request = (new SettingRequest())->setName('jira-host')->setValue('https://jira');

        $setting = (new SettingService($repository))->new($request, flush: false);

        self::assertSame('jira-host', $setting->getName());
        self::assertSame('https://jira', $setting->getValue());
    }

    public function testValueReturnsStoredValueOrNull(): void
    {
        $setting = (new Setting())->setValue('https://jira.example');
        $repository = $this->getMockBuilder(SettingRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findOneBy'])
            ->getMock();
        $repository
            ->expects(self::exactly(2))
            ->method('findOneBy')
            ->willReturnCallback(
                static fn (array $criteria): ?Setting => 'jira-host' === $criteria['name'] ? $setting : null
            );
        $service = new SettingService($repository);

        self::assertSame('https://jira.example', $service->value('jira-host'));
        self::assertNull($service->value('missing'));
    }

    /**
     * @dataProvider booleanValues
     */
    public function testBooleanValueUsesPhpBooleanFilter(?string $value, bool $expected): void
    {
        $setting = null === $value ? null : (new Setting())->setValue($value);
        $repository = $this->getMockBuilder(SettingRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findOneBy'])
            ->getMock();
        $repository->method('findOneBy')->willReturn($setting);

        self::assertSame($expected, (new SettingService($repository))->booleanValue('feature'));
    }

    public static function booleanValues(): iterable
    {
        yield from [
            ['true', true],
            ['false', false],
            [null, false],
        ];
    }

    /**
     * @dataProvider safeValues
     */
    public function testSafeValueRedactsSecretNames(
        string $name,
        ?string $value,
        ?string $expected,
    ): void {
        $repository = $this->getMockBuilder(SettingRepository::class)
            ->disableOriginalConstructor()
            ->getMock();
        $setting = (new Setting())->setName($name);

        if (null !== $value) {
            $setting->setValue($value);
        }

        self::assertSame($expected, (new SettingService($repository))->safeValue($setting));
    }

    public static function safeValues(): iterable
    {
        yield from [
            ['jira-host', 'https://jira.example', 'https://jira.example'],
            ['optional-value', null, null],
            ['JIRA_TOKEN', 'sensitive', '***REDACTED***'],
            ['database-password', 'sensitive', '***REDACTED***'],
            ['client-SECRET-value', 'sensitive', '***REDACTED***'],
            ['apiKey', 'sensitive', '***REDACTED***'],
        ];
    }
}
