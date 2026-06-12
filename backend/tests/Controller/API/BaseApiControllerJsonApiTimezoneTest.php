<?php

declare(strict_types=1);

namespace App\Tests\Controller\API;

use App\Controller\API\BaseApiController;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Service\DateTime\UserTimezoneResolver;
use App\Tests\Support\EntityIdSetter;
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;

class BaseApiControllerJsonApiTimezoneTest extends TestCase
{
    use EntityIdSetter;

    public function testJsonApiSerializesTimeLogsInResolvedUserTimezone(): void
    {
        $resolver = $this->createMock(UserTimezoneResolver::class);
        $resolver
            ->method('resolveCurrentUserTimezone')
            ->willReturn('Europe/Vienna');

        $controller = new class extends BaseApiController
        {
        };
        $controller->setContainer(new Container());
        $controller->setUserTimezoneResolver($resolver);

        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-06-05T22:00:00+00:00'))
            ->setEndTime(new \DateTimeImmutable('2026-06-06T21:59:00+00:00'));
        $this->setEntityId($timeLog, '123e4567-e89b-12d3-a456-426614174000');

        $response = $controller->jsonApi([$timeLog]);
        $payload = json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);

        self::assertSame('2026-06-06T00:00:00+02:00', $payload['data'][0]['startTime']);
        self::assertSame('2026-06-06T23:59:00+02:00', $payload['data'][0]['endTime']);
    }

    public function testJsonApiSerializesNestedTaskTimeLogsInResolvedUserTimezone(): void
    {
        $resolver = $this->createMock(UserTimezoneResolver::class);
        $resolver
            ->method('resolveCurrentUserTimezone')
            ->willReturn('Europe/Vienna');

        $controller = new class extends BaseApiController
        {
        };
        $controller->setContainer(new Container());
        $controller->setUserTimezoneResolver($resolver);

        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-06-05T22:00:00+00:00'))
            ->setEndTime(new \DateTimeImmutable('2026-06-06T21:59:00+00:00'));
        $this->setEntityId($timeLog, '123e4567-e89b-12d3-a456-426614174001');

        $task = (new Task())
            ->setName('test')
            ->setTimeLogs(new ArrayCollection([$timeLog]));
        $this->setEntityId($task, '123e4567-e89b-12d3-a456-426614174002');

        $response = $controller->jsonApi([$task]);
        $payload = json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);

        self::assertSame('2026-06-06T00:00:00+02:00', $payload['data'][0]['timeLogs'][0]['startTime']);
        self::assertSame('2026-06-06T23:59:00+02:00', $payload['data'][0]['timeLogs'][0]['endTime']);
        self::assertSame('2026-06-06T00:00:00+02:00', $payload['data'][0]['lastTimeLog']['startTime']);
        self::assertSame('2026-06-06T23:59:00+02:00', $payload['data'][0]['lastTimeLog']['endTime']);
    }
}
