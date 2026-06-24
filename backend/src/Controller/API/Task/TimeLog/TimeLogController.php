<?php

declare(strict_types=1);

namespace App\Controller\API\Task\TimeLog;

use App\Controller\API\BaseApiController;
use App\Controller\API\Task\TaskController;
use App\Dto\Task\TimeLog\TimeLogRequest;
use App\Entity\Task\TimeLog\TimeLog;
use App\Service\Task\TimeLog\TimeLogService;
use App\Service\Task\TimeLog\TimeLogWriteResult;
use App\Service\Task\TimeLog\TimeLogWriteStatus;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
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

    final public const OA_TAG = 'Time logs';
    final public const MODEL_SCHEMA = '#/components/schemas/TimeLogModel';

    public function __construct(
        private readonly TimeLogService $timeLogService,
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
        OA\Tag(name: self::OA_TAG),
        OA\Get(
            operationId: 'list-time-logs',
            summary: 'List Time Logs',
            tags: [self::OA_TAG],
        ),
        OA\Response(
            response: Response::HTTP_OK,
            description: 'Returns list of time-logs.',
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
            path: '/{id}',
            name: 'show-time-log',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_GET],
            stateless: true,
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Get(
            operationId: 'show-time-log',
            summary: 'Show TimeLog',
            tags: [self::OA_TAG],
        ),
        OA\Response(
            response: Response::HTTP_OK,
            description: 'Returns TimeLog',
            content: new OA\JsonContent(ref: self::MODEL_SCHEMA),
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

    #[
        Route(
            path: '',
            name: 'create-time-log',
            methods: [Request::METHOD_POST],
            stateless: true
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Post(
            operationId: 'create-time-log',
            summary: 'Create a new TimeLog',
            tags: [self::OA_TAG],
        ),
        OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/TimeLogCreateRequest')
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
        string $taskId,
        ValidatorInterface $validator,
        SerializerInterface $serializer,
        Request $request,
    ): JsonResponse {
        try {
            $timeLogRequest = $this->timeLogService->createRequest($taskId);
            if (!$timeLogRequest instanceof TimeLogRequest) {
                return $this->jsonApi(
                    errors: [TaskController::TASK_NOT_FOUND],
                    status: Response::HTTP_NOT_FOUND
                );
            }

            $timeLogRequest = $serializer->deserialize(
                data: $request->getContent(),
                type: TimeLogRequest::class,
                format: 'json',
                context: [
                    AbstractNormalizer::OBJECT_TO_POPULATE => $timeLogRequest,
                ]
            );
        } catch (UnexpectedValueException) {
            return $this->badRequestJsonApi();
        }

        $errors = $validator->validate(
            value: $timeLogRequest,
            groups: ['create']
        );

        if (\count($errors) > 0) {
            return $this->validationErrorJsonApi(
                constraintViolationList: $errors,
                status: Response::HTTP_NOT_ACCEPTABLE
            );
        }

        return $this->writeResultResponse(
            result: $this->timeLogService->create($timeLogRequest),
            failureMessage: self::CANNOT_CREATE_TIME_LOG,
            notFoundMessage: TaskController::TASK_NOT_FOUND
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
        OA\Tag(name: self::OA_TAG),
        OA\Patch(
            operationId: 'edit-time-log',
            summary: 'Edit TimeLog',
            tags: [self::OA_TAG],
        ),
        OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/TimeLogUpdateRequest')
        ),
        OA\Response(
            response: Response::HTTP_OK,
            description: 'Returns TimeLog',
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
        string $taskId,
        string $id,
        ValidatorInterface $validator,
        SerializerInterface $serializer,
        Request $request,
    ): JsonResponse {
        try {
            $timeLogRequest = $this->timeLogService->createRequest($taskId);
            if (!$timeLogRequest instanceof TimeLogRequest) {
                return $this->jsonApi(
                    errors: [TaskController::TASK_NOT_FOUND],
                    status: Response::HTTP_NOT_FOUND
                );
            }

            $timeLogRequest = $serializer->deserialize(
                data: $request->getContent(),
                type: TimeLogRequest::class,
                format: 'json',
                context: [
                    AbstractNormalizer::OBJECT_TO_POPULATE => $timeLogRequest,
                ]
            );
        } catch (UnexpectedValueException) {
            return $this->badRequestJsonApi();
        }

        $errors = $validator->validate(
            value: $timeLogRequest,
            groups: ['update']
        );

        if ((is_countable($errors) ? \count($errors) : 0) > 0) {
            return $this->validationErrorJsonApi(
                constraintViolationList: $errors,
                status: Response::HTTP_NOT_ACCEPTABLE
            );
        }

        return $this->writeResultResponse(
            result: $this->timeLogService->update(
                taskId: $taskId,
                id: $id,
                timeLogRequest: $timeLogRequest
            ),
            failureMessage: self::CANNOT_UPDATE_TIME_LOG,
            notFoundMessage: self::TIME_LOG_NOT_FOUND
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
        OA\Tag(name: self::OA_TAG),
        OA\Delete(
            operationId: 'delete-time-log',
            summary: 'Delete TimeLog',
            tags: [self::OA_TAG],
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
        return $this->deleteResultResponse(
            $this->timeLogService->remove(
                taskId: $taskId,
                id: $id
            )
        );
    }

    /**
     * @throws \Exception
     */
    #[
        Route(
            path: '/start',
            name: 'start-task',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_POST],
            stateless: true
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Post(
            operationId: 'start-task',
            summary: 'Start Task TimeLog',
            tags: [self::OA_TAG],
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
        return $this->lifecycleResultResponse($this->timeLogService->start($taskId));
    }

    /**
     * @throws \Exception
     */
    #[
        Route(
            path: '/stop',
            name: 'stop-task',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_POST],
            stateless: true
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Post(
            operationId: 'stop-task',
            summary: 'Stop Task TimeLog',
            tags: [self::OA_TAG],
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
        return $this->lifecycleResultResponse($this->timeLogService->stop($taskId));
    }

    private function writeResultResponse(
        TimeLogWriteResult $result,
        string $failureMessage,
        string $notFoundMessage,
    ): JsonResponse {
        if (TimeLogWriteStatus::Failed === $result->status) {
            return $this->jsonApi(
                errors: [$failureMessage],
                status: Response::HTTP_BAD_REQUEST
            );
        }

        if (TimeLogWriteStatus::NotFound === $result->status) {
            return $this->jsonApi(
                errors: [$notFoundMessage],
                status: Response::HTTP_NOT_FOUND
            );
        }

        return $this->jsonApi($result->timeLog);
    }

    private function deleteResultResponse(TimeLogWriteResult $result): JsonResponse
    {
        if (TimeLogWriteStatus::Failed === $result->status) {
            return $this->jsonApi(
                errors: [self::CANNOT_DELETE_TIME_LOG],
                status: Response::HTTP_BAD_REQUEST
            );
        }

        if (TimeLogWriteStatus::NotFound === $result->status) {
            return $this->jsonApi(
                errors: [self::TIME_LOG_NOT_FOUND],
                status: Response::HTTP_NOT_FOUND
            );
        }

        return $this->jsonApi(status: Response::HTTP_NO_CONTENT);
    }

    private function lifecycleResultResponse(TimeLogWriteResult $result): JsonResponse
    {
        if (TimeLogWriteStatus::NotFound === $result->status) {
            return $this->jsonApi(
                errors: [TaskController::TASK_NOT_FOUND],
                status: Response::HTTP_NOT_FOUND
            );
        }

        return $this->jsonApi(
            status: TimeLogWriteStatus::Failed === $result->status ? Response::HTTP_CONFLICT : Response::HTTP_NO_CONTENT,
        );
    }
}
