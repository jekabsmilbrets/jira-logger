<?php

declare(strict_types=1);

namespace App\Controller\API;

use App\Dto\JsonApi\JsonApi;
use App\Serializer\Normalizer\ModelNormalizer;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Serializer\Exception\ExceptionInterface;
use Symfony\Component\Validator\ConstraintViolationListInterface;

class BaseApiController extends AbstractController
{
    final public const BAD_REQUEST = 'Bad Request';

    final public function validationErrorJsonApi(
        ConstraintViolationListInterface $constraintViolationList,
        int $status = 400,
    ): JsonResponse {
        $outputErrors = [];

        foreach ($constraintViolationList as $singleConstraintViolationList) {
            $outputErrors[$singleConstraintViolationList->getPropertyPath(
            )] = $singleConstraintViolationList->getMessage();
        }

        return $this->jsonApi(
            errors: $outputErrors,
            status: $status
        );
    }

    /**
     * @throws ExceptionInterface
     */
    final public function jsonApi(
        mixed $data = null,
        mixed $errors = null,
        mixed $meta = null,
        int $status = 200,
        array $headers = [],
        array $context = []
    ): JsonResponse {
        $jsonApi = new JsonApi();

        if ($data) {
            $normalizer = new ModelNormalizer();
            $normalizedData = $normalizer->normalize(
                object: $data,
                context: ['groups' => ['list']]
            );

            $jsonApi->setData($normalizedData);
        }

        $jsonApi->setMeta($meta);
        $jsonApi->setErrors($errors);

        return $this->json(
            data: $jsonApi->jsonSerialize(),
            status: $status,
            headers: $headers,
            context: $context
        );
    }
}
