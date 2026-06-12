<?php

declare(strict_types=1);

namespace App\Tests\Serializer\Normalizer;

use App\Entity\Tag\Tag;
use App\Entity\Task\TimeLog\TimeLog;
use App\Serializer\Normalizer\ModelNormalizer;
use App\Tests\Support\EntityIdSetter;
use PHPUnit\Framework\TestCase;

class ModelNormalizerTest extends TestCase
{
    use EntityIdSetter;

    public function testSupportsNormalizationAlwaysTrue(): void
    {
        $normalizer = new ModelNormalizer();

        self::assertTrue($normalizer->supportsNormalization(new \stdClass()));
    }

    public function testGetSupportedTypesDeclaresObjectSupport(): void
    {
        $normalizer = new ModelNormalizer();

        self::assertSame(['object' => true], $normalizer->getSupportedTypes(null));
    }

    public function testNormalizeFormatsDateFieldsToAtom(): void
    {
        $normalizer = new ModelNormalizer();
        $tag = (new Tag())->setName('Ops');
        $this->setEntityId($tag, '123e4567-e89b-12d3-a456-426614174000');
        $tag->setCreatedAt(new \DateTimeImmutable('2026-01-01T10:00:00+00:00'));

        $data = $normalizer->normalize($tag);

        self::assertIsArray($data);
        self::assertSame('Ops', $data['name']);
        self::assertSame('2026-01-01T10:00:00+00:00', $data['createdAt']);
    }

    public function testNormalizeConvertsDateFieldsToProvidedTimezone(): void
    {
        $normalizer = new ModelNormalizer();
        $tag = (new Tag())->setName('Ops');
        $this->setEntityId($tag, '123e4567-e89b-12d3-a456-426614174000');
        $tag->setCreatedAt(new \DateTimeImmutable('2026-01-01T10:00:00+00:00'));
        $tag->setUpdatedAt(new \DateTimeImmutable('2026-01-01T12:00:00+00:00'));

        $data = $normalizer->normalize($tag, context: ['timezone' => 'Europe/Riga']);

        self::assertIsArray($data);
        self::assertSame('2026-01-01T12:00:00+02:00', $data['createdAt']);
        self::assertSame('2026-01-01T14:00:00+02:00', $data['updatedAt']);
    }

    public function testNormalizeConvertsManualTimeFieldForArrayPayloads(): void
    {
        $normalizer = new ModelNormalizer();

        $data = $normalizer->normalize(
            ['time' => new \DateTimeImmutable('2026-01-01T10:00:00+00:00')],
            context: ['timezone' => 'Europe/Riga']
        );

        self::assertIsArray($data);
        self::assertSame('2026-01-01T12:00:00+02:00', $data['time']);
    }

    public function testNormalizeConvertsTimeLogBoundariesToRequestedTimezone(): void
    {
        $normalizer = new ModelNormalizer();
        $timeLog = (new TimeLog())
            ->setStartTime(new \DateTimeImmutable('2026-06-02T22:00:00+00:00'))
            ->setEndTime(new \DateTimeImmutable('2026-06-03T21:59:00+00:00'));
        $this->setEntityId($timeLog, '123e4567-e89b-12d3-a456-426614174000');

        $data = $normalizer->normalize($timeLog, context: ['timezone' => 'Europe/Vienna']);

        self::assertIsArray($data);
        self::assertSame('2026-06-03T00:00:00+02:00', $data['startTime']);
        self::assertSame('2026-06-03T23:59:00+02:00', $data['endTime']);
    }
}
