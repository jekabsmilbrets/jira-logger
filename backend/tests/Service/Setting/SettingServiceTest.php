<?php

declare(strict_types=1);

namespace App\Tests\Service\Setting;

use App\Dto\Setting\SettingRequest;
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
}
