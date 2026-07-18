<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\Task\TimeLog;

use App\Controller\API\Task\TimeLog\TimeLogController;
use App\Dto\Task\TimeLog\TimeLogRequest;
use App\Entity\Task\TimeLog\TimeLog;
use App\Repository\Task\TaskRepository;
use App\Repository\Task\TimeLog\TimeLogRepository;
use App\Service\DateTime\DateInputParser;
use App\Service\DateTime\UserTimezoneResolver;
use App\Service\Tag\TagService;
use App\Service\Task\TaskService;
use App\Service\Task\TimeLog\TimeLogService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Serializer\Exception\UnexpectedValueException;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\ConstraintViolation;
use Symfony\Component\Validator\ConstraintViolationList;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class TimeLogControllerTest extends TestCase
{
    private function controllerWith(TimeLogRepository $timeLogRepository): TimeLogController
    {
        $controller = new TimeLogController(
            new TimeLogService(
                $timeLogRepository,
                new TaskService(
                    $this->createMock(TaskRepository::class),
                    $this->createMock(TagService::class),
                ),
                $this->createMock(DateInputParser::class),
                $this->createMock(UserTimezoneResolver::class),
            ),
        );
        $controller->setContainer(new Container());

        return $controller;
    }

    public function testListReturnsNotFoundWhenEmpty(): void
    {
        $repository = $this->createMock(TimeLogRepository::class);
        $repository->method('findBy')->willReturn([]);

        self::assertSame(404, $this->controllerWith($repository)->list('task-id')->getStatusCode());
    }

    public function testShowReturnsOkWhenFound(): void
    {
        $timeLog = (new TimeLog())->setStartTime(new \DateTimeImmutable('2026-01-01'));
        $repository = $this->createMock(TimeLogRepository::class);
        $repository->method('findOneBy')->willReturn($timeLog);

        self::assertSame(200, $this->controllerWith($repository)->show('task-id', 'log-id')->getStatusCode());
    }

    /**
     * @dataProvider writeMethodProvider
     */
    public function testWriteIntakePreservesMalformedJsonContract(string $method): void
    {
        $serializer = $this->createMock(SerializerInterface::class);
        $serializer->method('deserialize')->willThrowException(new UnexpectedValueException('bad json'));
        $validator = $this->createMock(ValidatorInterface::class);
        $validator->expects(self::never())->method('validate');
        $controller = $this->controllerWith($this->createMock(TimeLogRepository::class));
        $request = new Request(content: '{');

        $response = 'new' === $method
            ? $controller->new('route-task-id', $validator, $serializer, $request)
            : $controller->edit('route-task-id', 'time-log-id', $validator, $serializer, $request);

        self::assertSame(400, $response->getStatusCode());
        self::assertStringContainsString('Bad Request', (string) $response->getContent());
    }

    /**
     * @dataProvider writeMethodProvider
     */
    public function testWriteIntakePreservesValidationAndRouteTaskContract(string $method, string $group): void
    {
        $serializer = $this->createMock(SerializerInterface::class);
        $serializer
            ->expects(self::once())
            ->method('deserialize')
            ->with(
                '{}',
                TimeLogRequest::class,
                'json',
                self::callback(static function (array $context): bool {
                    $request = $context[AbstractNormalizer::OBJECT_TO_POPULATE] ?? null;

                    return $request instanceof TimeLogRequest && 'route-task-id' === $request->getTask();
                }),
            )
            ->willReturnCallback(
                static fn (mixed $data, string $type, string $format, array $context): TimeLogRequest =>
                    $context[AbstractNormalizer::OBJECT_TO_POPULATE]->setTask('body-task-id')
            );
        $validator = $this->createMock(ValidatorInterface::class);
        $validator
            ->expects(self::once())
            ->method('validate')
            ->with(
                self::callback(
                    static fn (TimeLogRequest $request): bool => 'route-task-id' === $request->getTask()
                ),
                null,
                [$group],
            )
            ->willReturn(new ConstraintViolationList([
                new ConstraintViolation('Invalid start time', null, [], null, 'startTime', null),
            ]));
        $controller = $this->controllerWith($this->createMock(TimeLogRepository::class));
        $request = new Request(content: '{}');

        $response = 'new' === $method
            ? $controller->new('route-task-id', $validator, $serializer, $request)
            : $controller->edit('route-task-id', 'time-log-id', $validator, $serializer, $request);

        self::assertSame(406, $response->getStatusCode());
        self::assertStringContainsString('Invalid start time', (string) $response->getContent());
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function writeMethodProvider(): array
    {
        return [
            'new' => ['new', 'create'],
            'edit' => ['edit', 'update'],
        ];
    }
}
