<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\JiraWorkLog;

use App\Controller\API\JiraWorkLog\JiraWorkLogController;
use App\Dto\JiraWorkLog\JiraWorkLogRequest;
use App\Entity\JiraWorkLog\JiraWorkLog;
use App\Repository\JiraWorkLog\JiraWorkLogRepository;
use App\Repository\Task\TaskRepository;
use App\Service\JiraWorkLog\JiraWorkLogService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Serializer\Exception\UnexpectedValueException;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\ConstraintViolation;
use Symfony\Component\Validator\ConstraintViolationList;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class JiraWorkLogControllerTest extends TestCase
{
    private function controllerWith(JiraWorkLogRepository $repository): JiraWorkLogController
    {
        $controller = new JiraWorkLogController(
            new JiraWorkLogService($repository, $this->createMock(TaskRepository::class))
        );
        $controller->setContainer(new Container());

        return $controller;
    }

    public function testListReturnsNotFoundWhenNoRows(): void
    {
        $repository = $this->createMock(JiraWorkLogRepository::class);
        $repository->method('findAll')->willReturn([]);

        self::assertSame(404, $this->controllerWith($repository)->list()->getStatusCode());
    }

    public function testShowReturnsOkWhenFound(): void
    {
        $item = (new JiraWorkLog())
            ->setWorkLogId('wl')
            ->setStartTime(new \DateTimeImmutable('2026-01-01'))
            ->setTimeSpentSeconds(60);

        $repository = $this->createMock(JiraWorkLogRepository::class);
        $repository->method('find')->willReturn($item);

        self::assertSame(200, $this->controllerWith($repository)->show('id')->getStatusCode());
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
        $controller = $this->controllerWith($this->createMock(JiraWorkLogRepository::class));
        $request = new Request(content: '{');

        $response = 'new' === $method
            ? $controller->new($validator, $serializer, $request)
            : $controller->edit('work-log-id', $validator, $serializer, $request);

        self::assertSame(400, $response->getStatusCode());
        self::assertStringContainsString('Bad Request', (string) $response->getContent());
    }

    /**
     * @dataProvider writeMethodProvider
     */
    public function testWriteIntakePreservesValidationContract(string $method, string $group): void
    {
        $jiraWorkLogRequest = new JiraWorkLogRequest();
        $serializer = $this->createMock(SerializerInterface::class);
        $serializer
            ->expects(self::once())
            ->method('deserialize')
            ->with('{}', JiraWorkLogRequest::class, 'json', [])
            ->willReturn($jiraWorkLogRequest);
        $validator = $this->createMock(ValidatorInterface::class);
        $validator
            ->expects(self::once())
            ->method('validate')
            ->with($jiraWorkLogRequest, null, [$group])
            ->willReturn(new ConstraintViolationList([
                new ConstraintViolation('Invalid task', null, [], null, 'task', null),
            ]));
        $controller = $this->controllerWith($this->createMock(JiraWorkLogRepository::class));
        $request = new Request(content: '{}');

        $response = 'new' === $method
            ? $controller->new($validator, $serializer, $request)
            : $controller->edit('work-log-id', $validator, $serializer, $request);

        self::assertSame(406, $response->getStatusCode());
        self::assertStringContainsString('Invalid task', (string) $response->getContent());
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
