<?php

declare(strict_types=1);

namespace App\Tests\Serializer\Normalizer;

use App\Entity\Task\TimeLog\TimeLog;
use App\Serializer\Normalizer\JsonApiResponseNormalizer;
use App\Tests\Support\EntityIdSetter;
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\MaxDepth;

final class JsonApiResponseNormalizerTest extends TestCase
{
    use EntityIdSetter;

    /**
     * @dataProvider falseyDataProvider
     */
    public function testNormalizeOmitsFalseyData(mixed $data): void
    {
        self::assertSame([], (new JsonApiResponseNormalizer())->normalize(data: $data));
    }

    public static function falseyDataProvider(): iterable
    {
        yield 'null' => [null];
        yield 'false' => [false];
        yield 'zero' => [0];
        yield 'empty string' => [''];
        yield 'string zero' => ['0'];
        yield 'empty array' => [[]];
    }

    /**
     * @dataProvider nonNullFalseyValueProvider
     */
    public function testNormalizeIncludesNonNullFalseyMetaAndErrors(mixed $value): void
    {
        self::assertSame(
            ['meta' => $value, 'errors' => $value],
            (new JsonApiResponseNormalizer())->normalize(meta: $value, errors: $value),
        );
    }

    public static function nonNullFalseyValueProvider(): iterable
    {
        yield 'false' => [false];
        yield 'zero' => [0];
        yield 'empty string' => [''];
        yield 'string zero' => ['0'];
        yield 'empty array' => [[]];
    }

    public function testNormalizeReturnsDataMetaAndErrorsInContractOrder(): void
    {
        self::assertSame(
            [
                'data' => ['id' => 1],
                'meta' => false,
                'errors' => 0,
            ],
            (new JsonApiResponseNormalizer())->normalize(
                data: ['id' => 1],
                meta: false,
                errors: 0,
            ),
        );
    }

    public function testNormalizeUsesListSerializationGroup(): void
    {
        self::assertSame(
            ['data' => ['visible' => 'included']],
            (new JsonApiResponseNormalizer())->normalize(data: new ListGroupFixture()),
        );
    }

    public function testNormalizeFormatsEntityDatesInTimezoneWithoutMutatingThem(): void
    {
        $startTime = new \DateTime('2026-06-02T22:00:00+00:00');
        $endTime = new \DateTime('2026-06-03T21:59:00+00:00');
        $timeLog = (new TimeLog())
            ->setStartTime($startTime)
            ->setEndTime($endTime);
        $this->setEntityId($timeLog, '123e4567-e89b-12d3-a456-426614174000');

        $response = (new JsonApiResponseNormalizer())->normalize(
            data: $timeLog,
            timezone: 'Europe/Vienna',
        );

        self::assertSame('2026-06-03T00:00:00+02:00', $response['data']['startTime']);
        self::assertSame('2026-06-03T23:59:00+02:00', $response['data']['endTime']);
        self::assertSame('2026-06-02T22:00:00+00:00', $startTime->format(\DateTimeInterface::ATOM));
        self::assertSame('2026-06-03T21:59:00+00:00', $endTime->format(\DateTimeInterface::ATOM));
    }

    public function testNormalizeRecursesThroughNestedArraysAndTraversables(): void
    {
        $response = (new JsonApiResponseNormalizer())->normalize(
            data: [
                'items' => new ArrayCollection([
                    ['time' => new \DateTimeImmutable('2026-01-01T10:00:00+00:00')],
                ]),
            ],
            timezone: 'Europe/Riga',
        );

        self::assertSame(
            '2026-01-01T12:00:00+02:00',
            $response['data']['items'][0]['time'],
        );
    }

    public function testNormalizePreservesCurrentMaxDepthOmission(): void
    {
        $root = new MaxDepthFixture('root');
        $child = new MaxDepthFixture('child');
        $grandchild = new MaxDepthFixture('grandchild');
        $root->setChild($child);
        $child->setChild($grandchild);

        self::assertSame(
            ['data' => ['child' => []]],
            (new JsonApiResponseNormalizer())->normalize(data: $root),
        );
    }

    public function testNormalizeReplacesCircularReferencesWithNull(): void
    {
        $first = new CircularFixture();
        $second = new CircularFixture();
        $first->setNext($second);
        $second->setNext($first);

        self::assertSame(
            ['data' => ['next' => ['next' => null]]],
            (new JsonApiResponseNormalizer())->normalize(data: $first),
        );
    }
}

final class ListGroupFixture
{
    #[Groups(['list'])]
    public string $visible = 'included';

    public string $hidden = 'excluded';
}

final class MaxDepthFixture
{
    #[Groups(['list']), MaxDepth(1)]
    private ?self $child = null;

    public function __construct(private readonly string $id)
    {
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getChild(): ?self
    {
        return $this->child;
    }

    public function setChild(self $child): void
    {
        $this->child = $child;
    }
}

final class CircularFixture
{
    private ?self $next = null;

    #[Groups(['list'])]
    public function getNext(): ?self
    {
        return $this->next;
    }

    public function setNext(self $next): void
    {
        $this->next = $next;
    }
}
