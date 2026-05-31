<?php

declare(strict_types=1);

namespace App\Tests\Serializer\Normalizer;

use App\Entity\Tag\Tag;
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
}
