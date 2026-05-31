<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\Task;

use App\Controller\API\Task\TaskController;
use App\Repository\Task\TaskRepository;
use App\Service\DateTime\DateInputParser;
use App\Service\JiraApi\JiraApiService;
use App\Service\Task\TaskService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Serializer\Exception\UnexpectedValueException;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class TaskControllerTest extends TestCase
{
    private function controllerWith(object $serializer, TaskRepository $taskRepository): TaskController
    {
        $controller = new TaskController(
            new TaskService($taskRepository),
            $this->createMock(JiraApiService::class),
            $this->createMock(ValidatorInterface::class),
            $serializer,
            $this->createMock(DateInputParser::class)
        );
        $controller->setContainer(new Container());

        return $controller;
    }

    public function testListReturnsBadRequestWhenFilterDenormalizationFails(): void
    {
        $serializer = new class implements SerializerInterface {
            public function serialize(mixed $data, string $format, array $context = []): string { return ''; }
            public function deserialize(mixed $data, string $type, string $format, array $context = []): mixed { return null; }
            public function denormalize(mixed $data, string $type, string $format = null, array $context = []): mixed
            {
                throw new UnexpectedValueException('bad');
            }
        };

        $repository = $this->createMock(TaskRepository::class);

        $response = $this->controllerWith($serializer, $repository)->list(new Request());

        self::assertSame(400, $response->getStatusCode());
    }

    public function testShowReturnsNotFoundWhenTaskMissing(): void
    {
        $serializer = new class implements SerializerInterface {
            public function serialize(mixed $data, string $format, array $context = []): string { return ''; }
            public function deserialize(mixed $data, string $type, string $format, array $context = []): mixed { return null; }
        };

        $repository = $this->createMock(TaskRepository::class);
        $repository->method('find')->willReturn(null);

        $response = $this->controllerWith($serializer, $repository)->show('missing');

        self::assertSame(404, $response->getStatusCode());
    }
}
