<?php

declare(strict_types=1);

namespace App\Serializer\Normalizer;

use DateTimeZone;
use Symfony\Component\Serializer\Mapping\Factory\ClassMetadataFactory;
use Symfony\Component\Serializer\Mapping\Loader\AttributeLoader;
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
        mixed   $object,
        ?string $format = null,
        array   $context = []
    ): float|int|bool|\ArrayObject|array|string|null
    {
        if (\is_array($object)) {
            return $this->normalizeNestedValues($object, $context);
        }

        $targetTimezone = $this->resolveTargetTimezone($context);

        $dateCallback = static function (
            $innerObject,
            $outerObject,
            string $attributeName,
            ?string $format = null,
            array $context = []
        ) use ($targetTimezone): ?string {
            if (!$innerObject instanceof \DateTimeInterface) {
                return null;
            }

            $dateTime = $innerObject;

            if (null !== $targetTimezone) {
                $dateTime = (clone $innerObject)->setTimezone($targetTimezone);
            }

            return $dateTime->format(\DateTimeInterface::ATOM);
        };

        $defaultContext = [
            AbstractObjectNormalizer::ENABLE_MAX_DEPTH => true,
            AbstractObjectNormalizer::MAX_DEPTH_HANDLER => static function (
                $innerObject,
                $outerObject,
                string $attributeName,
                ?string $format = null,
                array $context = []
            ): ?string {
                return \is_object($innerObject) ? $innerObject->getId() : null;
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
                'time' => $dateCallback,
            ],
        ];

        if (\array_key_exists('groups', $context)) {
            $defaultContext[AbstractNormalizer::GROUPS] = $context['groups'];
        }

        $classMetadataFactory = new ClassMetadataFactory(
            new AttributeLoader()
        );
        $normalizer = new ObjectNormalizer(
            classMetadataFactory: $classMetadataFactory,
            defaultContext: $defaultContext
        );

        $normalized = (new Serializer([$normalizer]))
            ->normalize($object);

        return $this->normalizeNestedValues($normalized, $context);
    }

    /**
     * {@inheritDoc}
     */
    final public function supportsNormalization(
        mixed   $data,
        ?string $format = null,
        array   $context = []
    ): bool
    {
        return true;
    }

    /**
     * {@inheritDoc}
     */
    public function getSupportedTypes(?string $format): array
    {
        // Return the supported types
        return ['object' => true];
    }

    private function resolveTargetTimezone(array $context): ?DateTimeZone
    {
        $timezone = $context['timezone'] ?? null;

        if (!\is_string($timezone) || '' === trim($timezone)) {
            return null;
        }

        try {
            return new DateTimeZone(trim($timezone));
        } catch (\Throwable) {
            return null;
        }
    }

    private function normalizeNestedValues(mixed $value, array $context): mixed
    {
        $timezone = $this->resolveTargetTimezone($context);

        if ($value instanceof \DateTimeInterface) {
            $dateTime = $value;

            if (null !== $timezone) {
                $dateTime = (clone $value)->setTimezone($timezone);
            }

            return $dateTime->format(\DateTimeInterface::ATOM);
        }

        if ($value instanceof \Traversable) {
            $value = iterator_to_array($value);
        }

        if (\is_object($value)) {
            return $this->normalize($value, context: $context);
        }

        if (\is_array($value)) {
            foreach ($value as $key => $item) {
                $value[$key] = $this->normalizeNestedValues($item, $context);
            }
        }

        return $value;
    }
}
