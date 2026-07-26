<?php

declare(strict_types=1);

namespace App\Tests\Service\Setting;

use App\Dto\Setting\SettingRequest;
use App\Entity\Setting\Setting;
use App\Repository\Setting\SettingRepository;
use App\Service\Setting\SettingService;
use App\Tests\Support\EntityIdSetter;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

final class SettingServiceTest extends TestCase
{
    use EntityIdSetter;

    public function testListDisclosesNormalValuesAndRedactsSensitiveValues(): void
    {
        $host = (new Setting())->setName('jira.host')->setValue('https://jira.example');
        $token = (new Setting())->setName('JIRA.Personal-Access-TOKEN')->setValue('secret');
        $this->setEntityId($host, 'host-id');
        $this->setEntityId($token, 'token-id');
        $repository = $this->repository(['findAll']);
        $repository->method('findAll')->willReturn([$host, $token]);

        $settings = (new SettingService($repository))->list();

        self::assertSame('https://jira.example', $settings[0]['value'] ?? null);
        self::assertSame(SettingService::REDACTED_VALUE, $settings[1]['value'] ?? null);
    }

    public function testListReturnsNullWhenRepositoryIsEmpty(): void
    {
        $repository = $this->repository(['findAll']);
        $repository->method('findAll')->willReturn([]);

        self::assertNull((new SettingService($repository))->list());
    }

    public function testCreateMapsPersistsAndDisclosesSetting(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager
            ->expects(self::once())
            ->method('persist')
            ->with(self::callback(function (Setting $setting): bool {
                $this->setEntityId($setting, 'setting-id');

                return 'jira-host' === $setting->getName()
                    && 'https://jira' === $setting->getValue();
            }));
        $entityManager->expects(self::once())->method('flush');
        $repository = $this->repository(['getEntityManager']);
        $repository->method('getEntityManager')->willReturn($entityManager);
        $request = (new SettingRequest())->setName('jira-host')->setValue('https://jira');

        $setting = (new SettingService($repository))->create($request);

        self::assertSame(
            ['id' => 'setting-id', 'name' => 'jira-host', 'value' => 'https://jira'],
            $setting,
        );
    }

    public function testFindValueReturnsRawStoredValueOrNull(): void
    {
        $setting = (new Setting())->setValue('https://jira.example');
        $repository = $this->repository(['findOneBy']);
        $repository
            ->expects(self::exactly(2))
            ->method('findOneBy')
            ->willReturnCallback(
                static fn (array $criteria): ?Setting => 'jira-host' === $criteria['name'] ? $setting : null
            );
        $service = new SettingService($repository);

        self::assertSame('https://jira.example', $service->findValue('jira-host'));
        self::assertNull($service->findValue('missing'));
    }

    /**
     * @dataProvider booleanValues
     */
    public function testBooleanValueUsesPhpBooleanFilter(?string $value, bool $expected): void
    {
        $setting = null === $value ? null : (new Setting())->setValue($value);
        $repository = $this->repository(['findOneBy']);
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

    public function testShowDisclosesSettingAndReturnsNullWhenMissing(): void
    {
        $token = (new Setting())->setName('apiKey')->setValue('sensitive');
        $this->setEntityId($token, 'token-id');
        $repository = $this->repository(['find']);
        $repository
            ->expects(self::exactly(2))
            ->method('find')
            ->willReturnCallback(static fn (string $id): ?Setting => 'token-id' === $id ? $token : null);
        $service = new SettingService($repository);

        self::assertSame(
            ['id' => 'token-id', 'name' => 'apiKey', 'value' => SettingService::REDACTED_VALUE],
            $service->show('token-id'),
        );
        self::assertNull($service->show('missing'));
    }

    public function testUpdateReturnsNullWhenSettingDoesNotExist(): void
    {
        $repository = $this->repository(['find']);
        $repository->method('find')->with('missing')->willReturn(null);

        $result = (new SettingService($repository))->update(
            'missing',
            (new SettingRequest())->setName('jira-host')->setValue('https://jira'),
        );

        self::assertNull($result);
    }

    public function testUpdatePersistsAndDisclosesSetting(): void
    {
        $setting = (new Setting())->setName('jira-host')->setValue('old');
        $this->setEntityId($setting, 'setting-id');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('flush');
        $repository = $this->repository(['find', 'getEntityManager']);
        $repository->method('find')->with('setting-id')->willReturn($setting);
        $repository->method('getEntityManager')->willReturn($entityManager);

        $result = (new SettingService($repository))->update(
            'setting-id',
            (new SettingRequest())->setName('jira-token')->setValue('new-secret'),
        );

        self::assertSame(
            ['id' => 'setting-id', 'name' => 'jira-token', 'value' => SettingService::REDACTED_VALUE],
            $result,
        );
        self::assertSame('new-secret', $setting->getValue());
    }

    /**
     * @dataProvider redactedWriteMethods
     */
    public function testRedactedValueCannotBeWritten(string $method): void
    {
        $setting = (new Setting())->setName('jira-token')->setValue('stored-secret');
        $repository = $this->repository(['find', 'getEntityManager']);
        $repository->method('find')->willReturn($setting);
        $repository->expects(self::never())->method('getEntityManager');
        $request = (new SettingRequest())
            ->setName('jira-token')
            ->setValue(SettingService::REDACTED_VALUE);

        try {
            if ('create' === $method) {
                (new SettingService($repository))->create($request);
            } else {
                (new SettingService($repository))->update('setting-id', $request);
            }

            self::fail('Expected redacted value write to be rejected.');
        } catch (\DomainException $exception) {
            self::assertSame(SettingService::REDACTED_VALUE_NOT_WRITABLE, $exception->getMessage());
        }

        self::assertSame('stored-secret', $setting->getValue());
    }

    public static function redactedWriteMethods(): iterable
    {
        yield from [
            ['create'],
            ['update'],
        ];
    }

    public function testDeleteReturnsFalseWhenMissingAndRemovesExistingSetting(): void
    {
        $setting = (new Setting())->setName('jira-host')->setValue('https://jira');
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('remove')->with($setting);
        $entityManager->expects(self::once())->method('flush');
        $repository = $this->repository(['find', 'getEntityManager']);
        $repository
            ->expects(self::exactly(2))
            ->method('find')
            ->willReturnOnConsecutiveCalls(null, $setting);
        $repository->method('getEntityManager')->willReturn($entityManager);
        $service = new SettingService($repository);

        self::assertFalse($service->delete('missing'));
        self::assertTrue($service->delete('setting-id'));
    }

    /**
     * @param list<string> $methods
     */
    private function repository(array $methods): SettingRepository
    {
        return $this->getMockBuilder(SettingRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods($methods)
            ->getMock();
    }
}
