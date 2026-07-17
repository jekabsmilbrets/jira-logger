<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\Tag;

use App\Controller\API\Tag\TagController;
use App\Dto\Tag\TagRequest;
use App\Entity\Tag\Tag;
use App\Entity\Task\Task;
use App\Repository\Tag\TagRepository;
use App\Service\Tag\TagService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Serializer\Exception\UnexpectedValueException;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\ConstraintViolation;
use Symfony\Component\Validator\ConstraintViolationList;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class TagControllerTest extends TestCase
{
    private function controllerWith(TagRepository $repository): TagController
    {
        $controller = new TagController(new TagService($repository));
        $controller->setContainer(new Container());

        return $controller;
    }

    public function testListReturnsNotFoundWhenServiceReturnsNull(): void
    {
        $repository = $this->createMock(TagRepository::class);
        $repository->method('findAll')->willReturn([]);

        $response = $this->controllerWith($repository)->list();

        self::assertSame(404, $response->getStatusCode());
    }

    public function testListReturnsOkWhenServiceReturnsTags(): void
    {
        $repository = $this->createMock(TagRepository::class);
        $repository->method('findAll')->willReturn([(new Tag())->setName('ops')]);

        $response = $this->controllerWith($repository)->list();

        self::assertSame(200, $response->getStatusCode());
        self::assertStringContainsString('"isUsed":false', (string) $response->getContent());
    }

    public function testShowReturnsOkWhenTagFound(): void
    {
        $tag = (new Tag())->setName('ops');
        $tag->addTask(new Task());
        $repository = $this->createMock(TagRepository::class);
        $repository->method('find')->willReturn($tag);

        $response = $this->controllerWith($repository)->show('id');

        self::assertSame(200, $response->getStatusCode());
        self::assertStringContainsString('"name":"ops"', (string) $response->getContent());
        self::assertStringContainsString('"isUsed":true', (string) $response->getContent());
    }

    public function testDeleteReturnsConflictWhenTagIsUsed(): void
    {
        $tag = (new Tag())->setName('ops');
        $tag->addTask(new Task());
        $repository = $this->createMock(TagRepository::class);
        $repository->method('find')->willReturn($tag);

        $response = $this->controllerWith($repository)->delete('id');

        self::assertSame(409, $response->getStatusCode());
        self::assertStringContainsString(TagService::TAG_IN_USE, (string) $response->getContent());
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
        $controller = $this->controllerWith($this->createMock(TagRepository::class));
        $request = new Request(content: '{');

        $response = 'new' === $method
            ? $controller->new($validator, $serializer, $request)
            : $controller->edit('tag-id', $validator, $serializer, $request);

        self::assertSame(400, $response->getStatusCode());
        self::assertStringContainsString('Bad Request', (string) $response->getContent());
    }

    /**
     * @dataProvider writeMethodProvider
     */
    public function testWriteIntakePreservesValidationContract(string $method, string $group): void
    {
        $tagRequest = new TagRequest();
        $serializer = $this->createMock(SerializerInterface::class);
        $serializer
            ->expects(self::once())
            ->method('deserialize')
            ->with('{}', TagRequest::class, 'json', [])
            ->willReturn($tagRequest);
        $validator = $this->createMock(ValidatorInterface::class);
        $validator
            ->expects(self::once())
            ->method('validate')
            ->with($tagRequest, null, [$group])
            ->willReturn(new ConstraintViolationList([
                new ConstraintViolation('Invalid name', null, [], null, 'name', null),
            ]));
        $controller = $this->controllerWith($this->createMock(TagRepository::class));
        $request = new Request(content: '{}');

        $response = 'new' === $method
            ? $controller->new($validator, $serializer, $request)
            : $controller->edit('tag-id', $validator, $serializer, $request);

        self::assertSame(406, $response->getStatusCode());
        self::assertStringContainsString('Invalid name', (string) $response->getContent());
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
