<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\Task;

use App\Controller\API\Task\TaskController;
use App\Dto\Task\TaskListFilterRequest;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Repository\Tag\TagRepository;
use App\Repository\Task\TaskRepository;
use App\Repository\Task\TimeLog\TimeLogRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\DateTime\UserTimezoneResolver;
use App\Service\Task\JiraSync\JiraTaskSyncService;
use App\Service\Task\ReportedTask\ReportedTaskQuery;
use App\Service\Task\Sync\TaskSyncResult;
use App\Service\Task\TaskService;
use App\Service\Task\TimeLog\TimeLogService;
use App\Service\DateTime\DateInputParser;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Validator\ConstraintViolation;
use Symfony\Component\Validator\ConstraintViolationList;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Serializer\Normalizer\DenormalizerInterface;
use Symfony\Component\Serializer\Exception\UnexpectedValueException;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class TaskControllerTest extends TestCase
{
    private function controllerWith(
        TaskService $taskService,
        SerializerInterface $serializer,
        ?ValidatorInterface $validator = null,
        ?JiraTaskSyncService $jiraTaskSyncService = null,
        ?ReportedTaskQuery $reportedTaskQuery = null,
    ): TaskController
    {
        $controller = new TaskController(
            $taskService,
            $reportedTaskQuery ?? $this->reportedTaskQueryWith(
                $this->getMockBuilder(TaskRepository::class)->disableOriginalConstructor()->getMock(),
            ),
            $jiraTaskSyncService ?? $this->createMock(JiraTaskSyncService::class),
            $validator ?? $this->createMock(ValidatorInterface::class),
            $serializer
        );
        $controller->setContainer(new Container());
        $timezoneResolver = $this->createMock(UserTimezoneResolver::class);
        $timezoneResolver->method('resolveCurrentUserTimezone')->willReturn('Europe/Riga');
        $controller->setUserTimezoneResolver($timezoneResolver);

        return $controller;
    }

    private function taskServiceWith(
        ?TaskRepository $taskRepository = null,
    ): TaskService {
        return new TaskService(
            $taskRepository ?? $this->getMockBuilder(TaskRepository::class)->disableOriginalConstructor()->getMock(),
            $this->createMock(TagRepository::class),
        );
    }

    private function reportedTaskQueryWith(TaskRepository $taskRepository): ReportedTaskQuery
    {
        $dateRangeResolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $dateRangeResolver->method('resolve')->willReturn(null);

        return new ReportedTaskQuery($taskRepository, $dateRangeResolver);
    }

    private function timeLogServiceWith(TimeLogRepository $timeLogRepository): TimeLogService
    {
        $timezoneResolver = $this->createMock(UserTimezoneResolver::class);
        $timezoneResolver->method('resolveCurrentUserTimezone')->willReturn('Europe/Riga');

        return new TimeLogService(
            $timeLogRepository,
            $this->createMock(TaskRepository::class),
            $this->createMock(DateInputParser::class),
            $timezoneResolver,
        );
    }

    public function testListReturnsBadRequestWhenFilterDenormalizationFails(): void
    {
        $serializer = new class implements SerializerInterface {
            public function serialize(mixed $data, string $format, array $context = []): string { return ''; }
            public function deserialize(mixed $data, string $type, string $format, array $context = []): mixed { return null; }

            public function denormalize(mixed $data, string $type, ?string $format = null, array $context = []): mixed
            {
                throw new UnexpectedValueException('bad');
            }
        };

        $taskService = $this->createMock(TaskService::class);

        $response = $this->controllerWith($taskService, $serializer)->list(new Request());

        self::assertSame(400, $response->getStatusCode());
    }

    public function testListReturnsValidationErrorWhenFilterValidationFails(): void
    {
        $filterRequest = new TaskListFilterRequest();

        $serializer = new class($filterRequest) implements SerializerInterface, DenormalizerInterface {
            public function __construct(private readonly TaskListFilterRequest $filterRequest)
            {
            }

            public function serialize(mixed $data, string $format, array $context = []): string
            {
                return '';
            }

            public function deserialize(mixed $data, string $type, string $format, array $context = []): mixed
            {
                return null;
            }

            public function denormalize(mixed $data, string $type, ?string $format = null, array $context = []): mixed
            {
                return $this->filterRequest;
            }

            public function supportsDenormalization(mixed $data, string $type, ?string $format = null, array $context = []): bool
            {
                return true;
            }

            public function getSupportedTypes(?string $format): array
            {
                return [TaskListFilterRequest::class => true];
            }
        };

        $validator = $this->createMock(ValidatorInterface::class);
        $validator
            ->method('validate')
            ->willReturn(
                new ConstraintViolationList([
                    new ConstraintViolation('Invalid filter', null, [], null, 'date', 'bad-value'),
                ])
            );

        $taskRepository = $this->getMockBuilder(TaskRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['createQueryBuilder'])
            ->getMock();
        $taskRepository->expects(self::never())->method('createQueryBuilder');
        $taskService = $this->taskServiceWith($taskRepository);

        $response = $this->controllerWith($taskService, $serializer, $validator)
            ->list(new Request());

        self::assertSame(406, $response->getStatusCode());
    }

    public function testListDoesNotRewriteTaskServiceFailuresAsBadRequest(): void
    {
        $validator = $this->createMock(ValidatorInterface::class);
        $filterRequest = (new TaskListFilterRequest())->setName('backend');

        $serializer = new class($filterRequest) implements SerializerInterface, DenormalizerInterface {
            public function __construct(private readonly TaskListFilterRequest $filterRequest)
            {
            }

            public function serialize(mixed $data, string $format, array $context = []): string
            {
                return '';
            }

            public function deserialize(mixed $data, string $type, string $format, array $context = []): mixed
            {
                return null;
            }

            public function denormalize(mixed $data, string $type, ?string $format = null, array $context = []): mixed
            {
                TestCase::assertSame(['name' => 'backend'], $data);
                TestCase::assertSame(TaskListFilterRequest::class, $type);
                TestCase::assertNull($format);
                TestCase::assertArrayHasKey(AbstractNormalizer::OBJECT_TO_POPULATE, $context);
                TestCase::assertInstanceOf(TaskListFilterRequest::class, $context[AbstractNormalizer::OBJECT_TO_POPULATE]);

                return $this->filterRequest;
            }

            public function supportsDenormalization(mixed $data, string $type, ?string $format = null, array $context = []): bool
            {
                return true;
            }

            public function getSupportedTypes(?string $format): array
            {
                return [TaskListFilterRequest::class => true];
            }
        };

        $validator->method('validate')->willReturn(new ConstraintViolationList());

        $taskRepository = $this->getMockBuilder(TaskRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['createQueryBuilder'])
            ->getMock();
        $taskRepository
            ->expects(self::once())
            ->method('createQueryBuilder')
            ->with('t')
            ->willThrowException(new \RuntimeException('Repository unavailable'));
        $taskService = $this->taskServiceWith($taskRepository);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Repository unavailable');

        $this->controllerWith(
            $taskService,
            $serializer,
            $validator,
            reportedTaskQuery: $this->reportedTaskQueryWith($taskRepository),
        )
            ->list(new Request(['name' => 'backend']));
    }

    public function testShowReturnsNotFoundWhenTaskMissing(): void
    {
        $serializer = $this->createMock(SerializerInterface::class);
        $taskRepository = $this->getMockBuilder(TaskRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['find'])
            ->getMock();
        $taskRepository->method('find')->with('missing')->willReturn(null);
        $taskService = $this->taskServiceWith($taskRepository);

        $response = $this->controllerWith($taskService, $serializer)->show('missing');

        self::assertSame(404, $response->getStatusCode());
    }

    public function testActiveReturnsNotFoundWhenNoTaskIsRunning(): void
    {
        $repository = $this->getMockBuilder(TimeLogRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findActive'])
            ->getMock();
        $repository->method('findActive')->willReturn(null);

        $response = $this->controllerWith(
            $this->createMock(TaskService::class),
            $this->createMock(SerializerInterface::class)
        )->active($this->timeLogServiceWith($repository));

        self::assertSame(404, $response->getStatusCode());
    }

    public function testActiveReturnsRunningTask(): void
    {
        $task = (new Task())->setName('active task');
        $timeLog = (new TimeLog())
            ->setTask($task)
            ->setStartTime(new \DateTimeImmutable('2026-07-09 09:00:00', new \DateTimeZone('Europe/Riga')));
        $repository = $this->getMockBuilder(TimeLogRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findActive'])
            ->getMock();
        $repository->method('findActive')->willReturn($timeLog);

        $response = $this->controllerWith(
            $this->createMock(TaskService::class),
            $this->createMock(SerializerInterface::class)
        )->active($this->timeLogServiceWith($repository));

        self::assertSame(200, $response->getStatusCode());
        self::assertStringContainsString('active task', (string) $response->getContent());
    }

    public function testTodayLoggedSecondsReturnsTotalSeconds(): void
    {
        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('-30 seconds'));
        $repository = $this->getMockBuilder(TimeLogRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findOverlappingRange'])
            ->getMock();
        $repository->method('findOverlappingRange')->willReturn([$timeLog]);

        $response = $this->controllerWith(
            $this->createMock(TaskService::class),
            $this->createMock(SerializerInterface::class)
        )->todayLoggedSeconds($this->timeLogServiceWith($repository));

        self::assertSame(200, $response->getStatusCode());
        self::assertStringContainsString('"totalSeconds"', (string) $response->getContent());
    }

    public function testTaskExistsReturnsConflictWhenNameAlreadyExists(): void
    {
        $serializer = $this->createMock(SerializerInterface::class);
        $taskRepository = $this->getMockBuilder(TaskRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findOneBy'])
            ->getMock();
        $taskRepository
            ->expects(self::once())
            ->method('findOneBy')
            ->with(['name' => 'existing task'])
            ->willReturn(new \App\Entity\Task\Task());
        $taskService = $this->taskServiceWith($taskRepository);

        $response = $this->controllerWith($taskService, $serializer)->taskExists(' existing task ');

        self::assertSame(409, $response->getStatusCode());
    }

    public function testTaskExistsReturnsNoContentWhenNameDoesNotExist(): void
    {
        $serializer = $this->createMock(SerializerInterface::class);
        $taskRepository = $this->getMockBuilder(TaskRepository::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['findOneBy'])
            ->getMock();
        $taskRepository
            ->expects(self::once())
            ->method('findOneBy')
            ->with(['name' => 'missing task'])
            ->willReturn(null);
        $taskService = $this->taskServiceWith($taskRepository);

        $response = $this->controllerWith($taskService, $serializer)->taskExists('missing task');

        self::assertSame(204, $response->getStatusCode());
    }

    public function testSyncWithJiraKeepsRouteDateAsRawString(): void
    {
        $method = new \ReflectionMethod(TaskController::class, 'syncWithJira');
        $dateParameter = $method->getParameters()[1];

        self::assertSame('date', $dateParameter->getName());
        self::assertSame('string', (string) $dateParameter->getType());
    }

    public function testSyncWithJiraPreservesHttpStatusMapping(): void
    {
        $jiraTaskSyncService = $this->createMock(JiraTaskSyncService::class);
        $jiraTaskSyncService
            ->method('syncTask')
            ->with('task-id', '2026-06-23')
            ->willReturn(TaskSyncResult::synced());

        $response = $this->controllerWith(
            $this->taskServiceWith(),
            $this->createMock(SerializerInterface::class),
            jiraTaskSyncService: $jiraTaskSyncService,
        )->syncWithJira('task-id', '2026-06-23');

        self::assertSame(204, $response->getStatusCode());
    }
}
