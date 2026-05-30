<?php

declare(strict_types=1);

namespace App\Controller\API;

use App\Dto\JsonApi\JsonApi;
use App\Serializer\Normalizer\ModelNormalizer;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Serializer\Exception\UnexpectedValueException;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Serializer\Exception\ExceptionInterface;
use Symfony\Component\Validator\ConstraintViolationListInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class BaseApiController extends AbstractController
{
    final public const BAD_REQUEST = 'Bad Request';

    final protected function badRequestJsonApi(string $message = self::BAD_REQUEST): JsonResponse
    {
        return $this->jsonApi(
            errors: [$message],
            status: Response::HTTP_BAD_REQUEST
        );
    }

    /**
     * @throws UnexpectedValueException
     */
    final protected function deserializeJsonRequest(
        SerializerInterface $serializer,
        Request $request,
        string $type,
        ?object $populate = null,
    ): mixed {
        $context = [];

        if (null !== $populate) {
            $context[AbstractNormalizer::OBJECT_TO_POPULATE] = $populate;
        }

        return $serializer->deserialize(
            data: $request->getContent(),
            type: $type,
            format: 'json',
            context: $context,
        );
    }

    final protected function validateRequestDto(
        ValidatorInterface $validator,
        mixed $requestDto,
        string $group,
        int $status = Response::HTTP_NOT_ACCEPTABLE,
    ): ?JsonResponse {
        $errors = $validator->validate(
            value: $requestDto,
            groups: [$group]
        );

        if (\count($errors) > 0) {
            return $this->validationErrorJsonApi(
                constraintViolationList: $errors,
                status: $status
            );
        }

        return null;
    }

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
