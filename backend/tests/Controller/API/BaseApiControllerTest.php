<?php

declare(strict_types=1);

namespace App\Tests\Controller\API;

use App\Controller\API\BaseApiController;
use App\Service\DateTime\UserTimezoneResolver;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\Validator\ConstraintViolationInterface;
use Symfony\Component\Validator\ConstraintViolationListInterface;

class BaseApiControllerTest extends TestCase
{
    private function buildTimezoneResolver(string $timezone): UserTimezoneResolver
    {
        $resolver = $this->createMock(UserTimezoneResolver::class);
        $resolver->method('resolveCurrentUserTimezone')->willReturn($timezone);

        return $resolver;
    }

    public function testJsonApiWrapsData(): void
    {
        $controller = new class extends BaseApiController {
            public function runJsonApi(mixed $data = null, mixed $errors = null, int $status = 200)
            {
                return $this->jsonApi($data, $errors, null, $status);
            }
        };
        $controller->setContainer(new Container());
        $controller->setUserTimezoneResolver($this->buildTimezoneResolver('Europe/Riga'));

        $response = $controller->runJsonApi(['x' => 1]);

        self::assertSame(200, $response->getStatusCode());
        self::assertStringContainsString('"data":{"x":1}', (string) $response->getContent());
    }

    public function testValidationErrorJsonApiMapsPropertyErrors(): void
    {
        $violation = $this->createMock(ConstraintViolationInterface::class);
        $violation->method('getPropertyPath')->willReturn('name');
        $violation->method('getMessage')->willReturn('invalid');

        $list = new class($violation) implements ConstraintViolationListInterface, \IteratorAggregate {
            public function __construct(private readonly ConstraintViolationInterface $violation) {}
            public function add(ConstraintViolationInterface $violation): void {}
            public function addAll(ConstraintViolationListInterface $otherList): void {}
            public function get(int $offset): ConstraintViolationInterface { return $this->violation; }
            public function has(int $offset): bool { return $offset === 0; }
            public function set(int $offset, ConstraintViolationInterface $violation): void {}
            public function remove(int $offset): void {}
            public function count(): int { return 1; }
            public function getIterator(): \Traversable { return new \ArrayIterator([$this->violation]); }
            public function offsetExists(mixed $offset): bool { return $offset === 0; }
            public function offsetGet(mixed $offset): ConstraintViolationInterface { return $this->violation; }
            public function offsetSet(mixed $offset, mixed $value): void {}
            public function offsetUnset(mixed $offset): void {}
            public function __toString(): string { return 'name: invalid'; }
        };

        $controller = new class extends BaseApiController {};
        $controller->setContainer(new Container());
        $controller->setUserTimezoneResolver($this->buildTimezoneResolver('Europe/Riga'));

        $response = $controller->validationErrorJsonApi($list, 406);

        self::assertSame(406, $response->getStatusCode());
        self::assertStringContainsString('"errors":{"name":"invalid"}', (string) $response->getContent());
    }

    public function testJsonApiConvertsDateTimeFieldsToResolvedTimezone(): void
    {
        $controller = new class extends BaseApiController {
            public function runJsonApi(mixed $data = null, mixed $errors = null, int $status = 200)
            {
                return $this->jsonApi($data, $errors, null, $status);
            }
        };
        $controller->setContainer(new Container());
        $controller->setUserTimezoneResolver($this->buildTimezoneResolver('Europe/Riga'));

        $response = $controller->runJsonApi(
            ['time' => new \DateTimeImmutable('2026-06-01T10:00:00+00:00')]
        );

        self::assertSame(200, $response->getStatusCode());
        self::assertStringContainsString(
            '"time":"2026-06-01T13:00:00+03:00"',
            (string) $response->getContent()
        );
    }
}
