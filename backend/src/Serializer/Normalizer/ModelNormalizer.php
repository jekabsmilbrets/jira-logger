<?php

declare(strict_types=1);

namespace App\Serializer\Normalizer;

use ArrayObject;
use DateTime;
use DateTimeInterface;
use Doctrine\Common\Annotations\AnnotationReader;
use Symfony\Component\Serializer\Mapping\Factory\ClassMetadataFactory;
use Symfony\Component\Serializer\Mapping\Loader\AnnotationLoader;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;
use Symfony\Component\Serializer\Normalizer\AbstractObjectNormalizer;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;
use Symfony\Component\Serializer\Normalizer\ObjectNormalizer;
use Symfony\Component\Serializer\Serializer;

class ModelNormalizer implements NormalizerInterface
{
    /**
     * {@inheritDoc}
     */
    final public function normalize(
        mixed  $object,
        string $format = null,
        array  $context = []
    ): float|int|bool|ArrayObject|array|string|null {
        $dateCallback = static function (
            $innerObject,
            $outerObject,
            string $attributeName,
            string $format = null,
            array $context = []
        ): ?string {
            return $innerObject instanceof DateTime ? $innerObject->format(DateTimeInterface::ATOM) : null;
        };

        $defaultContext = [
            AbstractObjectNormalizer::ENABLE_MAX_DEPTH => true,
            AbstractObjectNormalizer::MAX_DEPTH_HANDLER => static function (
                $innerObject,
                $outerObject,
                string $attributeName,
                string $format = null,
                array $context = []
            ): ?string {
                return is_object($innerObject) ? $innerObject->getId() : null;
            },
            AbstractNormalizer::CIRCULAR_REFERENCE_HANDLER => static function (
                $object,
                $format,
                $context
            ) {
                return null;
            },
            AbstractNormalizer::CALLBACKS => [
                'createdAt' => $dateCallback,
                'updatedAt' => $dateCallback,
                'startTime' => $dateCallback,
                'originalStartTime' => $dateCallback,
                'endTime' => $dateCallback,
                'originalEndTime' => $dateCallback,
            ],
        ];

        if (array_key_exists('groups', $context)) {
            $defaultContext[AbstractNormalizer::GROUPS] = $context['groups'];
        }

        $classMetadataFactory = new ClassMetadataFactory(
            new AnnotationLoader(new AnnotationReader())
        );
        $normalizer = new ObjectNormalizer(
            classMetadataFactory: $classMetadataFactory,
            defaultContext: $defaultContext
        );

        return (new Serializer([$normalizer]))
            ->normalize($object);
    }

    /**
     * {@inheritDoc}
     */
    final public function supportsNormalization(mixed $data, string $format = null): bool
    {
        return true;
    }
}
