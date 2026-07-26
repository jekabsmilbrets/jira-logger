<?php

declare(strict_types=1);

namespace App\Serializer\Normalizer;

use DateTimeZone;
use Symfony\Component\Serializer\Mapping\Factory\ClassMetadataFactory;
use Symfony\Component\Serializer\Mapping\Loader\AttributeLoader;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;
use Symfony\Component\Serializer\Normalizer\AbstractObjectNormalizer;
use Symfony\Component\Serializer\Normalizer\DateTimeNormalizer;
use Symfony\Component\Serializer\Normalizer\ObjectNormalizer;
use Symfony\Component\Serializer\Serializer;

final class JsonApiResponseNormalizer
{
    /** @return array{data?: mixed, meta?: mixed, errors?: mixed} */
    public function normalize(
        mixed $data = null,
        mixed $errors = null,
        mixed $meta = null,
        ?string $timezone = null,
    ): array {
        $response = [];

        if ($data) {
            $response['data'] = $this->serializer($timezone)->normalize($data);
        }

        if (null !== $meta) {
            $response['meta'] = $meta;
        }

        if (null !== $errors) {
            $response['errors'] = $errors;
        }

        return $response;
    }

    private function serializer(?string $timezone): Serializer
    {
        $objectNormalizer = new ObjectNormalizer(
            classMetadataFactory: new ClassMetadataFactory(new AttributeLoader()),
            defaultContext: [
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
                AbstractNormalizer::GROUPS => ['list'],
            ],
        );
        $dateTimeContext = [
            DateTimeNormalizer::FORMAT_KEY => \DateTimeInterface::ATOM,
        ];

        if (null !== ($targetTimezone = $this->resolveTargetTimezone($timezone))) {
            $dateTimeContext[DateTimeNormalizer::TIMEZONE_KEY] = $targetTimezone;
        }

        return new Serializer([
            new DateTimeNormalizer($dateTimeContext),
            $objectNormalizer,
        ]);
    }

    private function resolveTargetTimezone(?string $timezone): ?DateTimeZone
    {
        if (null === $timezone || '' === trim($timezone)) {
            return null;
        }

        try {
            return new DateTimeZone(trim($timezone));
        } catch (\Throwable) {
            return null;
        }
    }
}
