<?php

declare(strict_types=1);

namespace App\Controller\API\Task\TimeLog;

use App\Controller\API\BaseApiController;
use App\Controller\API\Task\TaskController;
use App\Dto\Task\TimeLog\TimeLogRequest;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Service\Task\TaskService;
use App\Service\Task\TimeLog\TimeLogService;
use Exception;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Serializer\Exception\UnexpectedValueException;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route(
    path: '/api/task/{taskId}/time-log',
    stateless: true
)]
class TimeLogController extends BaseApiController
{
    final public const TIME_LOG_NOT_FOUND = 'TimeLog not found';
    final public const TIME_LOGS_NOT_FOUND = 'TimeLogs not found';
    final public const CANNOT_CREATE_TIME_LOG = 'Can not Create TimeLog';
    final public const CANNOT_DELETE_TIME_LOG = 'Can not Delete TimeLog';
    final public const CANNOT_UPDATE_TIME_LOG = 'Can not Update TimeLog';

    public function __construct(
        private readonly TimeLogService $timeLogService,
        private readonly TaskService    $taskService,
    ) {
    }

    #[
        Route(
            path: '',
            name: 'list-time-logs',
            requirements: ['taskId' => Requirement::UUID],
            methods: [Request::METHOD_GET],
            stateless: true,
        ),
        OA\Tag(name: 'Time logs'),
        OA\Get(
            operationId: 'list-time-logs',
            summary: 'List Time Logs',
            tags: ['Time logs'],
        ),
        OA\Response(
            response: Response::HTTP_OK,
            description: 'Returns list of time-logs.',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'data',
                        type: 'array',
                        items: new OA\Items(ref: '#/components/schemas/TimeLogModel')
                    ),
                ]
            ),
        ),
        OA\Response(
            response: Response::HTTP_NOT_FOUND,
            description: self::TIME_LOGS_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::TIME_LOGS_NOT_FOUND
                        )
                    ),
                ]
            ),
        ),
    ]
    final public function list(
        string $taskId,
    ): JsonResponse {
        $timeLogs = $this->timeLogService->list(taskId: $taskId);

        if (empty($timeLogs) || [] === $timeLogs) {
            return $this->jsonApi(
                errors: [self::TIME_LOGS_NOT_FOUND],
                status: Response::HTTP_NOT_FOUND
            );
        }

        return $this->jsonApi(
            $timeLogs
        );
    }

    #[
        Route(
            path: '',
            name: 'create-time-log',
            methods: [Request::METHOD_POST],
            stateless: true
        ),
        OA\Tag(name: 'Time logs'),
        OA\Post(
            operationId: 'create-time-log',
            summary: 'Create a new TimeLog',
            tags: ['Time logs'],
        ),
        OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/TimeLogCreateRequest')
        ),
        OA\Response(
            response: Response::HTTP_OK,
            description: 'Task created successfully',
            content: new OA\JsonContent(ref: '#/components/schemas/TimeLogModel'),
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
                            example: self::CANNOT_CREATE_TIME_LOG
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
        string              $taskId,
        ValidatorInterface  $validator,
        SerializerInterface $serializer,
        Request             $request,
        TaskService         $taskService,
    ): JsonResponse {
        try {
            $timeLogRequest = new TimeLogRequest(
                taskService: $taskService
            );
            $timeLogRequest = $serializer->deserialize(
                data: $request->getContent(),
                type: TimeLogRequest::class,
                format: 'json',
                context: [
                    AbstractNormalizer::OBJECT_TO_POPULATE => $timeLogRequest,
                ]
            );
        } catch (UnexpectedValueException) {
            return $this->jsonApi(
                errors: [self::BAD_REQUEST],
                status: Response::HTTP_BAD_REQUEST
            );
        }

        if (null === $timeLogRequest->getTask()) {
            $timeLogRequest->setTask($taskId);
        }

        $errors = $validator->validate(
            value: $timeLogRequest,
            groups: ['create']
        );

        if (count($errors) > 0) {
            return $this->validationErrorJsonApi(
                constraintViolationList: $errors,
                status: Response::HTTP_NOT_ACCEPTABLE
            );
        }

        try {
            $timeLog = $this->timeLogService->new($timeLogRequest);
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_CREATE_TIME_LOG],
                status: Response::HTTP_BAD_REQUEST
            );
        }

        return $this->jsonApi(
            $timeLog
        );
    }

    #[
        Route(
            path: '/{id}',
            name: 'edit-time-log',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_PATCH],
            stateless: true,
        ),
        OA\Tag(name: 'Time logs'),
        OA\Patch(
            operationId: 'edit-time-log',
            summary: 'Edit TimeLog',
            tags: ['Time logs'],
        ),
        OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/TimeLogUpdateRequest')
        ),
        OA\Response(
            response: Response::HTTP_OK,
            description: 'Returns TimeLog',
            content: new OA\JsonContent(ref: '#/components/schemas/TimeLogModel'),
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
            description: self::TIME_LOG_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::TIME_LOG_NOT_FOUND
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
        string              $taskId,
        string              $id,
        ValidatorInterface  $validator,
        SerializerInterface $serializer,
        Request             $request,
        TaskService         $taskService
    ): JsonResponse {
        try {
            $timeLogRequest = new TimeLogRequest(
                taskService: $taskService
            );
            $timeLogRequest = $serializer->deserialize(
                data: $request->getContent(),
                type: TimeLogRequest::class,
                format: 'json',
                context: [
                    AbstractNormalizer::OBJECT_TO_POPULATE => $timeLogRequest,
                ]
            );
        } catch (UnexpectedValueException) {
            return $this->jsonApi(
                errors: [self::BAD_REQUEST],
                status: Response::HTTP_BAD_REQUEST
            );
        }

        $errors = $validator->validate(
            value: $timeLogRequest,
            groups: ['update']
        );

        if ((is_countable($errors) ? count($errors) : 0) > 0) {
            return $this->validationErrorJsonApi(
                constraintViolationList: $errors,
                status: Response::HTTP_NOT_ACCEPTABLE
            );
        }

        try {
            $timeLog = $this->timeLogService->edit(
                taskId: $taskId,
                id: $id,
                timeLogRequest: $timeLogRequest
            );
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_UPDATE_TIME_LOG],
                status: Response::HTTP_BAD_REQUEST
            );
        }

        if (!$timeLog instanceof TimeLog) {
            return $this->jsonApi(
                errors: [self::TIME_LOG_NOT_FOUND],
                status: Response::HTTP_NOT_FOUND
            );
        }

        return $this->jsonApi(
            $timeLog
        );
    }

    #[
        Route(
            path: '/{id}',
            name: 'delete-time-log',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_DELETE],
            stateless: true,
        ),
        OA\Tag(name: 'Time logs'),
        OA\Delete(
            operationId: 'delete-time-log',
            summary: 'Delete TimeLog',
            tags: ['Time logs'],
        ),
        OA\Response(
            response: Response::HTTP_NO_CONTENT,
            description: 'TimeLog deleted',
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
                            example: self::CANNOT_DELETE_TIME_LOG
                        )
                    ),
                ]
            ),
        ),
        OA\Response(
            response: Response::HTTP_NOT_FOUND,
            description: self::TIME_LOG_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::TIME_LOG_NOT_FOUND
                        )
                    ),
                ]
            ),
        ),
    ]
    final public function delete(
        string $taskId,
        string $id
    ): JsonResponse {
        try {
            $status = $this->timeLogService->delete(
                taskId: $taskId,
                id: $id
            );
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_DELETE_TIME_LOG],
                status: Response::HTTP_BAD_REQUEST
            );
        }

        if (!$status) {
            return $this->jsonApi(
                errors: [self::TIME_LOG_NOT_FOUND],
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
            path: '/start',
            name: 'start-task',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_GET],
            stateless: true
        ),
        OA\Tag(name: 'Tasks'),
        OA\Get(
            operationId: 'start-task',
            summary: 'Start Task TimeLog',
            tags: ['Tasks'],
        ),
        OA\Response(
            response: Response::HTTP_NO_CONTENT,
            description: 'Task TimeLog started!',
        ),
        OA\Response(
            response: Response::HTTP_CONFLICT,
            description: 'Problems starting Task TimeLog!',
        ),
    ]
    final public function startNewTimeLog(
        string $taskId,
    ): JsonResponse {
        $task = $this->taskService->show($taskId);

        if (!$task instanceof Task) {
            return $this->jsonApi(
                errors: [TaskController::TASK_NOT_FOUND],
                status: Response::HTTP_NOT_FOUND
            );
        }

        $timeLog = $this->timeLogService->startTaskTimeLog($task);

        return $this->jsonApi(
            status: $timeLog ? Response::HTTP_NO_CONTENT : Response::HTTP_CONFLICT,
        );
    }

    #[
        Route(
            path: '/{id}',
            name: 'show-time-log',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_GET],
            stateless: true,
        ),
        OA\Tag(name: 'Time logs'),
        OA\Get(
            operationId: 'show-time-log',
            summary: 'Show TimeLog',
            tags: ['Time logs'],
        ),
        OA\Response(
            response: Response::HTTP_OK,
            description: 'Returns TimeLog',
            content: new OA\JsonContent(ref: '#/components/schemas/TimeLogModel'),
        ),
        OA\Response(
            response: Response::HTTP_NOT_FOUND,
            description: self::TIME_LOG_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::TIME_LOG_NOT_FOUND
                        )
                    ),
                ]
            ),
        ),
    ]
    final public function show(
        string $taskId,
        string $id
    ): JsonResponse {
        $timeLog = $this->timeLogService->show(
            taskId: $taskId,
            id: $id
        );

        if (!$timeLog instanceof TimeLog) {
            return $this->jsonApi(
                errors: [self::TIME_LOGS_NOT_FOUND],
                status: Response::HTTP_NOT_FOUND
            );
        }

        return $this->jsonApi(
            $timeLog
        );
    }

    /**
     * @throws Exception
     */
    #[
        Route(
            path: '/stop',
            name: 'stop-task',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_GET],
            stateless: true
        ),
        OA\Tag(name: 'Tasks'),
        OA\Get(
            operationId: 'stop-task',
            summary: 'Stop Task TimeLog',
            tags: ['Tasks'],
        ),
        OA\Response(
            response: Response::HTTP_NO_CONTENT,
            description: 'Task TimeLog stopped!',
        ),
        OA\Response(
            response: Response::HTTP_CONFLICT,
            description: 'Problems stopping Task TimeLog!',
        ),
    ]
    final public function stopExistingTimeLog(
        string $taskId,
    ): JsonResponse {
        $task = $this->taskService->show($taskId);

        if (!$task instanceof Task) {
            return $this->jsonApi(
                errors: [TaskController::TASK_NOT_FOUND],
                status: Response::HTTP_NOT_FOUND
            );
        }

        $timeLog = $this->timeLogService->stopTaskTimeLog($task);

        if (!$timeLog instanceof TimeLog) {
            return $this->jsonApi(
                errors: ['Problems stopping Task TimeLog!'],
                status: Response::HTTP_CONFLICT
            );
        }

        return $this->jsonApi(
            status: Response::HTTP_NO_CONTENT,
        );
    }
}
