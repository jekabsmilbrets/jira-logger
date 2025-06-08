<?php

declare(strict_types=1);

namespace App\Controller\API\Task;

use App\Controller\API\BaseApiController;
use App\Dto\Task\TaskRequest;
use App\Entity\Task\Task;
use App\Exception\JiraApiServiceException;
use App\Service\JiraApi\JiraApiService;
use App\Service\Task\TaskService;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Exception;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Serializer\Exception\ExceptionInterface;
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

    final public const OA_TAG = 'Tasks';
    final public const MODEL_SCHEMA = '#/components/schemas/TaskModel';

    public function __construct(
        private readonly TaskService $taskService,
        private readonly JiraApiService $jiraApiService,
    ) {
    }

    /**
     * @throws Exception
     * @throws ExceptionInterface
     */
    #[
        Route(
            path: '',
            name: 'list-tasks',
            methods: [Request::METHOD_GET],
            stateless: true
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Get(
            operationId: 'list-tasks',
            summary: 'List Tasks',
            tags: [self::OA_TAG],
        ),
        OA\Parameter(
            name: 'date',
            description: 'Single date to filter Task by Time Log timestamps',
            in: 'query',
            schema: new OA\Schema(type: 'string')
        ),
        OA\Parameter(
            name: 'startDate',
            description: 'Start date to filter Task by Time Log timestamps',
            in: 'query',
            schema: new OA\Schema(type: 'string')
        ),
        OA\Parameter(
            name: 'endDate',
            description: 'End date to filter Task by Time Log timestamps',
            in: 'query',
            schema: new OA\Schema(type: 'string')
        ),
        OA\Parameter(
            name: 'tags',
            description: 'Tag uuids`s joined by ","',
            in: 'query',
            schema: new OA\Schema(type: 'string')
        ),
        OA\Parameter(
            name: 'hideUnreported',
            description: 'Hide tags without Time Logs',
            in: 'query',
            schema: new OA\Schema(type: 'boolean')
        ),
        OA\Response(
            response: Response::HTTP_OK,
            description: 'Returns list of tasks.',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'data',
                        type: 'array',
                        items: new OA\Items(ref: self::MODEL_SCHEMA)
                    ),
                ]
            ),
        ),
        OA\Response(
            response: Response::HTTP_NOT_FOUND,
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
    final public function list(
        Request $request,
    ): JsonResponse {
        $queryParameters = [
            'tags',
            'name',
            'date',
            'startDate',
            'endDate',
            'hideUnreported',
        ];

        $filter = array_filter(
            array: array_reduce(
                array: $queryParameters,
                callback: static fn (array $carry, string $queryParameter): array => array_merge(
                    $carry,
                    [
                        $queryParameter => $request->query->get($queryParameter),
                    ]
                ),
                initial: []
            ),
            callback: static function ($value): bool {
                return null !== $value;
            },
            mode: \ARRAY_FILTER_USE_BOTH
        );

        $tasks = $this->taskService->list($filter);

        if (empty($tasks) || [] === $tasks) {
            return $this->jsonApi(
                errors: [self::TASKS_NOT_FOUND],
                status: Response::HTTP_NOT_FOUND
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
            methods: [Request::METHOD_GET],
            stateless: true,
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Get(
            operationId: 'show-task',
            summary: 'Show task',
            tags: [self::OA_TAG]
        ),
        OA\Response(
            response: Response::HTTP_OK,
            description: 'Returns task',
            content: new OA\JsonContent(ref: self::MODEL_SCHEMA),
        ),
        OA\Response(
            response: Response::HTTP_NOT_FOUND,
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
        string $id,
    ): JsonResponse {
        $task = $this->taskService->show($id);

        if (!$task instanceof Task) {
            return $this->jsonApi(
                errors: [self::TASK_NOT_FOUND],
                status: Response::HTTP_NOT_FOUND
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
            methods: [Request::METHOD_POST],
            stateless: true
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Post(
            operationId: 'create-task',
            summary: 'Create a new task',
            tags: [self::OA_TAG],
        ),
        OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/TaskCreateRequest')
        ),
        OA\Response(
            response: Response::HTTP_OK,
            description: 'Task created successfully',
            content: new OA\JsonContent(ref: self::MODEL_SCHEMA),
        ),
        OA\Response(
            response: Response::HTTP_BAD_REQUEST,
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
            response: Response::HTTP_NOT_ACCEPTABLE,
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
        TaskRequest $taskRequest,
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
                status: Response::HTTP_BAD_REQUEST
            );
        }

        $errors = $validator->validate(
            value: $taskRequest,
            groups: ['create']
        );

        if (\count($errors) > 0) {
            return $this->validationErrorJsonApi(
                constraintViolationList: $errors,
                status: Response::HTTP_NOT_ACCEPTABLE
            );
        }

        try {
            $task = $this->taskService->new($taskRequest);
        } /* @noinspection PhpRedundantCatchClauseInspection */ catch (UniqueConstraintViolationException) {
            return $this->jsonApi(
                errors: [self::DUPLICATE_TASK_NAME],
                status: Response::HTTP_BAD_REQUEST
            );
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_CREATE_TASK],
                status: Response::HTTP_BAD_REQUEST
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
            methods: [Request::METHOD_PATCH],
            stateless: true,
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Patch(
            operationId: 'edit-task',
            summary: 'Edit Task',
            tags: [self::OA_TAG],
        ),
        OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/TaskUpdateRequest')
        ),
        OA\Response(
            response: Response::HTTP_OK,
            description: 'Returns task',
            content: new OA\JsonContent(ref: self::MODEL_SCHEMA),
        ),
        OA\Response(
            response: Response::HTTP_BAD_REQUEST,
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
            response: Response::HTTP_NOT_FOUND,
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
            response: Response::HTTP_NOT_ACCEPTABLE,
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
        TaskRequest $taskRequest,
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
                status: Response::HTTP_BAD_REQUEST
            );
        }

        $errors = $validator->validate(
            value: $taskRequest,
            groups: ['update']
        );

        if (\count($errors) > 0) {
            return $this->validationErrorJsonApi(
                constraintViolationList: $errors,
                status: Response::HTTP_NOT_ACCEPTABLE
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
                status: Response::HTTP_BAD_REQUEST
            );
        }

        if (!$task instanceof Task) {
            return $this->jsonApi(
                errors: [self::TASK_NOT_FOUND],
                status: Response::HTTP_NOT_FOUND
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
            methods: [Request::METHOD_DELETE],
            stateless: true,
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Delete(
            operationId: 'delete-task',
            summary: 'Delete Task',
            tags: [self::OA_TAG],
        ),
        OA\Response(
            response: Response::HTTP_NO_CONTENT,
            description: 'Task deleted',
        ),
        OA\Response(
            response: Response::HTTP_BAD_REQUEST,
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
            response: Response::HTTP_NOT_FOUND,
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
                status: Response::HTTP_BAD_REQUEST
            );
        }

        if (!$status) {
            return $this->jsonApi(
                errors: [self::TASK_NOT_FOUND],
                status: Response::HTTP_NOT_FOUND
            );
        }

        return $this->jsonApi(
            status: Response::HTTP_NO_CONTENT
        );
    }

    /**
     * @throws Exception
     */
    #[
        Route(
            path: '/exist/{name}',
            name: 'task-exist',
            requirements: ['name' => Requirement::CATCH_ALL],
            methods: [Request::METHOD_GET],
            stateless: true
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Get(
            operationId: 'task-exist',
            summary: 'Task exist check',
            tags: [self::OA_TAG],
        ),
        OA\Parameter(
            name: 'name',
            description: 'Name to check for existence',
            in: 'path',
            schema: new OA\Schema(type: 'string')
        ),
        OA\Response(
            response: Response::HTTP_NO_CONTENT,
            description: 'Task does not exist!',
        ),
        OA\Response(
            response: Response::HTTP_CONFLICT,
            description: 'Task exists!',
        ),
    ]
    final public function taskExists(
        ?Task $foundTask,
    ): JsonResponse {
        return $this->jsonApi(
            status: $foundTask ? Response::HTTP_CONFLICT : Response::HTTP_NO_CONTENT,
        );
    }

    /**
     * @throws Exception
     */
    #[
        Route(
            path: '/{id}/{date}',
            name: 'sync-task-with-jira',
            requirements: [
                'id' => Requirement::UUID,
                'date' => Requirement::DATE_YMD,
            ],
            methods: [Request::METHOD_GET],
            stateless: true
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Get(
            operationId: 'sync-task-with-jira',
            summary: 'Sync Task with JIRA',
            tags: [self::OA_TAG],
        ),
        OA\Parameter(
            name: 'id',
            description: 'Task UUID',
            in: 'path',
            schema: new OA\Schema(type: 'string')
        ),
        OA\Parameter(
            name: 'date',
            description: 'Sync Date',
            in: 'path',
            schema: new OA\Schema(type: 'string')
        ),
        OA\Response(
            response: Response::HTTP_NO_CONTENT,
            description: 'Task at specified date has been synced with JIRA successfully!',
        ),
        OA\Response(
            response: Response::HTTP_CONFLICT,
            description: 'Problems syncing with JIRA!',
        ),
        OA\Response(
            response: Response::HTTP_NOT_FOUND,
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
    final public function syncWithJira(
        string $id,
        \DateTime $date,
    ): JsonResponse {
        $task = $this->taskService->show($id);

        if (!$task instanceof Task) {
            return $this->jsonApi(
                errors: [self::TASK_NOT_FOUND],
                status: Response::HTTP_NOT_FOUND
            );
        }

        try {
            $this->jiraApiService->init();
            $synced = $this->jiraApiService->sync($task, $date);
        } catch (JiraApiServiceException $e) {
            return $this->jsonApi(
                errors: ['Problems syncing with JIRA!', $e->getMessage()],
                status: Response::HTTP_CONFLICT
            );
        }

        return $this->jsonApi(
            status: !$synced ? Response::HTTP_CONFLICT : Response::HTTP_NO_CONTENT,
        );
    }
}
