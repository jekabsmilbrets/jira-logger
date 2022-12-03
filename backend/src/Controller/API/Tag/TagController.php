<?php

declare(strict_types=1);

namespace App\Controller\API\Tag;

use App\Controller\API\BaseApiController;
use App\Dto\Tag\TagRequest;
use App\Entity\Tag\Tag;
use App\Service\Tag\TagService;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Exception;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Serializer\Exception\UnexpectedValueException;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route(
    path: '/api/tag',
    stateless: true
)]
class TagController extends BaseApiController
{
    final public const TAG_NOT_FOUND = 'Tag not found';
    final public const TAGS_NOT_FOUND = 'Tags not found';
    final public const CANNOT_CREATE_TAG = 'Can not Create Tag';
    final public const CANNOT_DELETE_TAG = 'Can not Delete Tag';
    final public const CANNOT_UPDATE_TAG = 'Can not Update Tag';
    final public const DUPLICATE_TAG_NAME = 'Duplicate Tag name';

    public function __construct(
        private readonly TagService $tagService,
    ) {
    }

    #[
        Route(
            path: '',
            name: 'list-tags',
            methods: [Request::METHOD_GET],
            stateless: true
        ),
        OA\Tag(name: 'Tags'),
        OA\Get(
            operationId: 'list-tags',
            summary: 'List Tags',
            tags: ['Tags'],
        ),
        OA\Response(
            response: 200,
            description: 'Returns list of tags.',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'data',
                        type: 'array',
                        items: new OA\Items(ref: '#/components/schemas/TagModel')
                    ),
                ]
            ),
        ),
        OA\Response(
            response: 404,
            description: self::TAGS_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::TAGS_NOT_FOUND
                        )
                    ),
                ]
            ),
        ),
    ]
    final public function list(): JsonResponse
    {
        $tags = $this->tagService->list();

        if (null === $tags) {
            return $this->jsonApi(
                errors: [self::TAGS_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi(
            $tags
        );
    }

    #[
        Route(
            path: '/{id}',
            name: 'show-tag',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_GET],
            stateless: true,
        ),
        OA\Tag(name: 'Tags'),
        OA\Get(
            operationId: 'show-tag',
            summary: 'Show tag',
            tags: ['Tags']
        ),
        OA\Response(
            response: 200,
            description: 'Returns tag',
            content: new OA\JsonContent(ref: '#/components/schemas/TagModel'),
        ),
        OA\Response(
            response: 404,
            description: self::TAG_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::TAG_NOT_FOUND
                        )
                    ),
                ]
            ),
        ),
    ]
    final public function show(
        string $id
    ): JsonResponse {
        $tag = $this->tagService->show($id);

        if (!$tag instanceof Tag) {
            return $this->jsonApi(
                errors: [self::TAG_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi(
            $tag
        );
    }

    #[
        Route(
            path: '',
            name: 'create-tag',
            methods: [Request::METHOD_POST],
            stateless: true
        ),
        OA\Tag(name: 'Tags'),
        OA\Post(
            operationId: 'create-tag',
            summary: 'Create a new tag',
            tags: ['Tags'],
        ),
        OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/TagCreateRequest')
        ),
        OA\Response(
            response: 200,
            description: 'Tag created successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/TagModel'),
        ),
        OA\Response(
            response: 400,
            description: self::BAD_REQUEST,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::DUPLICATE_TAG_NAME
                        )
                    ),
                ]
            )
        ),
        OA\Response(
            response: 406,
            description: 'Validation failed',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        properties: [
                            new OA\Property(
                                property: 'name',
                                type: 'string',
                                example: 'This value should not be null.'
                            ),
                        ],
                        type: 'object'
                    ),
                ]
            ),
        ),
    ]
    final public function new(
        ValidatorInterface $validator,
        SerializerInterface $serializer,
        Request $request,
    ): JsonResponse {
        try {
            $tagRequest = $serializer->deserialize(
                data: $request->getContent(),
                type: TagRequest::class,
                format: 'json'
            );
        } catch (UnexpectedValueException) {
            return $this->jsonApi(
                errors: [self::BAD_REQUEST],
                status: 400
            );
        }

        $errors = $validator->validate(
            value: $tagRequest,
            groups: ['create']
        );

        if (\count($errors) > 0) {
            return $this->validationErrorJsonApi(
                constraintViolationList: $errors,
                status: 406
            );
        }

        try {
            $tag = $this->tagService->new($tagRequest);
        } /* @noinspection PhpRedundantCatchClauseInspection */ catch (UniqueConstraintViolationException) {
            return $this->jsonApi(
                errors: [self::DUPLICATE_TAG_NAME],
                status: 400
            );
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_CREATE_TAG],
                status: 400
            );
        }

        return $this->jsonApi(
            $tag
        );
    }

    #[
        Route(
            path: '/{id}',
            name: 'edit-tag',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_PATCH],
            stateless: true,
        ),
        OA\Tag(name: 'Tags'),
        OA\Patch(
            operationId: 'edit-tag',
            summary: 'Edit Tag',
            tags: ['Tags'],
        ),
        OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/TagUpdateRequest')
        ),
        OA\Response(
            response: 200,
            description: 'Returns tag',
            content: new OA\JsonContent(ref: '#/components/schemas/TagModel'),
        ),
        OA\Response(
            response: 400,
            description: self::BAD_REQUEST,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::BAD_REQUEST
                        )
                    ),
                ]
            )
        ),
        OA\Response(
            response: 404,
            description: self::TAG_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::TAG_NOT_FOUND
                        )
                    ),
                ]
            ),
        ),
        OA\Response(
            response: 406,
            description: 'Validation failed',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        properties: [
                            new OA\Property(
                                property: 'name',
                                type: 'string',
                                example: 'This value should not be null.'
                            ),
                        ],
                        type: 'object'
                    ),
                ]
            ),
        ),
    ]
    final public function edit(
        string $id,
        ValidatorInterface $validator,
        SerializerInterface $serializer,
        Request $request,
    ): JsonResponse {
        try {
            $tagRequest = $serializer->deserialize(
                data: $request->getContent(),
                type: TagRequest::class,
                format: 'json'
            );
        } catch (UnexpectedValueException) {
            return $this->jsonApi(
                errors: [self::BAD_REQUEST],
                status: 400
            );
        }

        $errors = $validator->validate(
            value: $tagRequest,
            groups: ['update']
        );

        if (\count($errors) > 0) {
            return $this->validationErrorJsonApi(
                constraintViolationList: $errors,
                status: 406
            );
        }

        try {
            $tag = $this->tagService->edit(
                id: $id,
                tagRequest: $tagRequest
            );
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_UPDATE_TAG],
                status: 400
            );
        }

        if (!$tag instanceof Tag) {
            return $this->jsonApi(
                errors: [self::TAG_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi(
            $tag
        );
    }

    #[
        Route(
            path: '/{id}',
            name: 'delete-tag',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_DELETE],
            stateless: true,
        ),
        OA\Tag(name: 'Tags'),
        OA\Delete(
            operationId: 'delete-tag',
            summary: 'Delete Tag',
            tags: ['Tags'],
        ),
        OA\Response(
            response: 204,
            description: 'Tag deleted',
        ),
        OA\Response(
            response: 400,
            description: self::BAD_REQUEST,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::CANNOT_DELETE_TAG
                        )
                    ),
                ]
            ),
        ),
        OA\Response(
            response: 404,
            description: self::TAG_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::TAG_NOT_FOUND
                        )
                    ),
                ]
            ),
        ),
    ]
    final public function delete(
        string $id
    ): JsonResponse {
        try {
            $status = $this->tagService->delete($id);
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_DELETE_TAG],
                status: 400
            );
        }

        if (!$status) {
            return $this->jsonApi(
                errors: [self::TAG_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi(
            status: 204
        );
    }
}
