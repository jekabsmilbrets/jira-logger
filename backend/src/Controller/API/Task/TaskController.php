<?php

declare(strict_types=1);

namespace App\Controller\API\Task;

use App\Controller\API\BaseApiController;
use App\Dto\Task\TaskRequest;
use App\Entity\Task\Task;
use App\Service\Task\TaskService;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Exception;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Serializer\Exception\UnexpectedValueException;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route(
    path: '/api/task',
    stateless: true
)]
class TaskController extends BaseApiController
{
    final public const TASK_NOT_FOUND = 'Task not found';
    final public const TASKS_NOT_FOUND = 'Tasks not found';
    final public const CANNOT_CREATE_TASK = 'Can not Create Task';
    final public const CANNOT_DELETE_TASK = 'Can not Delete Task';
    final public const CANNOT_UPDATE_TASK = 'Can not Update Task';
    final public const DUPLICATE_TASK_NAME = 'Duplicate Task name';

    public function __construct(
        private readonly TaskService $taskService,
    ) {
    }

    #[
        Route(
            path: '',
            name: 'list-tasks',
            methods: ['GET'],
            stateless: true
        ),
        OA\Tag(name: 'Tasks'),
        OA\Get(
            operationId: 'list-tasks',
            summary: 'List Tasks',
            tags: ['Tasks'],
        ),
        OA\Response(
            response: 200,
            description: 'Returns list of tasks.',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'data',
                        type: 'array',
                        items: new OA\Items(ref: '#/components/schemas/TaskModel')
                    ),
                ]
            ),
        ),
        OA\Response(
            response: 404,
            description: self::TASKS_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::TASKS_NOT_FOUND
                        )
                    ),
                ]
            ),
        ),
    ]
    final public function list(): JsonResponse
    {
        $tasks = $this->taskService->list();

        if (empty($tasks) || [] === $tasks) {
            return $this->jsonApi(
                errors: [self::TASKS_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi(
            $tasks
        );
    }

    #[
        Route(
            path: '/{id}',
            name: 'show-task',
            requirements: ['id' => Requirement::UUID],
            methods: ['GET'],
            stateless: true,
        ),
        OA\Tag(name: 'Tasks'),
        OA\Get(
            operationId: 'show-task',
            summary: 'Show task',
            tags: ['Tasks']
        ),
        OA\Response(
            response: 200,
            description: 'Returns task',
            content: new OA\JsonContent(ref: '#/components/schemas/TaskModel'),
        ),
        OA\Response(
            response: 404,
            description: self::TASK_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::TASK_NOT_FOUND
                        )
                    ),
                ]
            ),
        ),
    ]
    final public function show(
        string $id
    ): JsonResponse {
        $task = $this->taskService->show($id);

        if (!$task instanceof Task) {
            return $this->jsonApi(
                errors: [self::TASK_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi(
            $task
        );
    }

    #[
        Route(
            path: '',
            name: 'create-task',
            methods: ['POST'],
            stateless: true
        ),
        OA\Tag(name: 'Tasks'),
        OA\Post(
            operationId: 'create-task',
            summary: 'Create a new task',
            tags: ['Tasks'],
        ),
        OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/TaskCreateRequest')
        ),
        OA\Response(
            response: 200,
            description: 'Task created successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/TaskModel'),
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
                            example: self::DUPLICATE_TASK_NAME
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
        ValidatorInterface  $validator,
        SerializerInterface $serializer,
        Request             $request,
        TaskRequest         $taskRequest,
    ): JsonResponse {
        try {
            $taskRequest = $serializer->deserialize(
                data: $request->getContent(),
                type: TaskRequest::class,
                format: 'json',
                context: [
                    AbstractNormalizer::OBJECT_TO_POPULATE => $taskRequest,
                ]
            );
        } catch (UnexpectedValueException) {
            return $this->jsonApi(
                errors: [self::BAD_REQUEST],
                status: 400
            );
        }

        $errors = $validator->validate(
            value: $taskRequest,
            groups: ['create']
        );

        if (count($errors) > 0) {
            return $this->validationErrorJsonApi(
                constraintViolationList: $errors,
                status: 406
            );
        }

        try {
            $task = $this->taskService->new($taskRequest);
        } /* @noinspection PhpRedundantCatchClauseInspection */ catch (UniqueConstraintViolationException) {
            return $this->jsonApi(
                errors: [self::DUPLICATE_TASK_NAME],
                status: 400
            );
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_CREATE_TASK],
                status: 400
            );
        }

        return $this->jsonApi(
            $task
        );
    }

    #[
        Route(
            path: '/{id}',
            name: 'edit-task',
            requirements: ['id' => Requirement::UUID],
            methods: ['PATCH'],
            stateless: true,
        ),
        OA\Tag(name: 'Tasks'),
        OA\Patch(
            operationId: 'edit-task',
            summary: 'Edit Task',
            tags: ['Tasks'],
        ),
        OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/TaskUpdateRequest')
        ),
        OA\Response(
            response: 200,
            description: 'Returns task',
            content: new OA\JsonContent(ref: '#/components/schemas/TaskModel'),
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
            description: self::TASK_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::TASK_NOT_FOUND
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
        string              $id,
        ValidatorInterface  $validator,
        SerializerInterface $serializer,
        Request             $request,
        TaskRequest         $taskRequest,
    ): JsonResponse {
        try {
            $taskRequest = $serializer->deserialize(
                data: $request->getContent(),
                type: TaskRequest::class,
                format: 'json',
                context: [
                    AbstractNormalizer::OBJECT_TO_POPULATE => $taskRequest,
                ]
            );
        } catch (UnexpectedValueException) {
            return $this->jsonApi(
                errors: [self::BAD_REQUEST],
                status: 400
            );
        }

        $errors = $validator->validate(
            value: $taskRequest,
            groups: ['update']
        );

        if (count($errors) > 0) {
            return $this->validationErrorJsonApi(
                constraintViolationList: $errors,
                status: 406
            );
        }

        try {
            $task = $this->taskService->edit(
                id: $id,
                taskRequest: $taskRequest
            );
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_UPDATE_TASK],
                status: 400
            );
        }

        if (!$task instanceof Task) {
            return $this->jsonApi(
                errors: [self::TASK_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi(
            $task
        );
    }

    #[
        Route(
            path: '/{id}',
            name: 'delete-task',
            requirements: ['id' => Requirement::UUID],
            methods: ['DELETE'],
            stateless: true,
        ),
        OA\Tag(name: 'Tasks'),
        OA\Delete(
            operationId: 'delete-task',
            summary: 'Delete Task',
            tags: ['Tasks'],
        ),
        OA\Response(
            response: 204,
            description: 'Task deleted',
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
                            example: self::CANNOT_DELETE_TASK
                        )
                    ),
                ]
            ),
        ),
        OA\Response(
            response: 404,
            description: self::TASK_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::TASK_NOT_FOUND
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
            $status = $this->taskService->delete($id);
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_DELETE_TASK],
                status: 400
            );
        }

        if (!$status) {
            return $this->jsonApi(
                errors: [self::TASK_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi(
            status: 204
        );
    }
}
