<?php

declare(strict_types=1);

namespace App\Controller\API\JiraWorkLog;

use App\Controller\API\BaseApiController;
use App\Dto\JiraWorkLog\JiraWorkLogRequest;
use App\Entity\JiraWorkLog\JiraWorkLog;
use App\Service\JiraWorkLog\JiraWorkLogService;
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
    path: '/api/jira-work-log',
    stateless: true
)]
class JiraWorkLogController extends BaseApiController
{
    final public const JIRA_WORK_LOG_NOT_FOUND = 'JiraWorkLog not found';
    final public const JIRA_WORK_LOGS_NOT_FOUND = 'JiraWorkLogs not found';
    final public const CANNOT_CREATE_JIRA_WORK_LOG = 'Can not Create JiraWorkLog';
    final public const CANNOT_DELETE_JIRA_WORK_LOG = 'Can not Delete JiraWorkLog';
    final public const CANNOT_UPDATE_JIRA_WORK_LOG = 'Can not Update JiraWorkLog';
    final public const DUPLICATE_JIRA_WORK_LOG_NAME = 'Duplicate JiraWorkLog name';

    final public const OA_TAG = 'Jira Work Logs';
    final public const MODEL_SCHEMA = '#/components/schemas/JiraWorkLogModel';

    public function __construct(
        private readonly JiraWorkLogService $jiraWorkLogService,
    )
    {
    }

    #[
        Route(
            path: '',
            name: 'list-jira-work-logs',
            methods: [Request::METHOD_GET],
            stateless: true
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Get(
            operationId: 'list-jira-work-logs',
            summary: 'List JiraWorkLogs',
            tags: [self::OA_TAG],
        ),
        OA\Response(
            response: 200,
            description: 'Returns list of JiraWorkLogs.',
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
            response: 404,
            description: self::JIRA_WORK_LOGS_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::JIRA_WORK_LOGS_NOT_FOUND
                        )
                    ),
                ]
            ),
        ),
    ]
    final public function list(): JsonResponse
    {
        $jiraWorkLogs = $this->jiraWorkLogService->list();

        if (null === $jiraWorkLogs) {
            return $this->jsonApi(
                errors: [self::JIRA_WORK_LOGS_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi(
            $jiraWorkLogs
        );
    }

    #[
        Route(
            path: '/{id}',
            name: 'show-jira-work-log',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_GET],
            stateless: true,
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Get(
            operationId: 'show-jira-work-log',
            summary: 'Show JiraWorkLog',
            tags: [self::OA_TAG]
        ),
        OA\Response(
            response: 200,
            description: 'Returns JiraWorkLog',
            content: new OA\JsonContent(ref: self::MODEL_SCHEMA),
        ),
        OA\Response(
            response: 404,
            description: self::JIRA_WORK_LOG_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::JIRA_WORK_LOG_NOT_FOUND
                        )
                    ),
                ]
            ),
        ),
    ]
    final public function show(
        string $id
    ): JsonResponse
    {
        $jiraWorkLog = $this->jiraWorkLogService->show($id);

        if (!$jiraWorkLog instanceof JiraWorkLog) {
            return $this->jsonApi(
                errors: [self::JIRA_WORK_LOG_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi(
            $jiraWorkLog
        );
    }

    #[
        Route(
            path: '',
            name: 'create-jira-work-log',
            methods: [Request::METHOD_POST],
            stateless: true
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Post(
            operationId: 'create-jira-work-log',
            summary: 'Create a new JiraWorkLog',
            tags: [self::OA_TAG],
        ),
        OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/JiraWorkLogCreateRequest')
        ),
        OA\Response(
            response: 200,
            description: 'JiraWorkLog created successfully',
            content: new OA\JsonContent(ref: self::MODEL_SCHEMA),
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
                            example: self::DUPLICATE_JIRA_WORK_LOG_NAME
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
    ): JsonResponse
    {
        try {
            $jiraWorkLogRequest = $serializer->deserialize(
                data: $request->getContent(),
                type: JiraWorkLogRequest::class,
                format: 'json'
            );
        } catch (UnexpectedValueException) {
            return $this->jsonApi(
                errors: [self::BAD_REQUEST],
                status: 400
            );
        }

        $errors = $validator->validate(
            value: $jiraWorkLogRequest,
            groups: ['create']
        );

        if (\count($errors) > 0) {
            return $this->validationErrorJsonApi(
                constraintViolationList: $errors,
                status: 406
            );
        }

        try {
            $jiraWorkLog = $this->jiraWorkLogService->new($jiraWorkLogRequest);
        } /* @noinspection PhpRedundantCatchClauseInspection */ catch (UniqueConstraintViolationException) {
            return $this->jsonApi(
                errors: [self::DUPLICATE_JIRA_WORK_LOG_NAME],
                status: 400
            );
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_CREATE_JIRA_WORK_LOG],
                status: 400
            );
        }

        return $this->jsonApi(
            $jiraWorkLog
        );
    }

    #[
        Route(
            path: '/{id}',
            name: 'edit-jira-work-log',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_PATCH],
            stateless: true,
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Patch(
            operationId: 'edit-jira-work-log',
            summary: 'Edit JiraWorkLog',
            tags: [self::OA_TAG],
        ),
        OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/JiraWorkLogUpdateRequest')
        ),
        OA\Response(
            response: 200,
            description: 'Returns JiraWorkLog',
            content: new OA\JsonContent(ref: self::MODEL_SCHEMA),
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
            description: self::JIRA_WORK_LOG_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::JIRA_WORK_LOG_NOT_FOUND
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
    ): JsonResponse
    {
        try {
            $jiraWorkLogRequest = $serializer->deserialize(
                data: $request->getContent(),
                type: JiraWorkLogRequest::class,
                format: 'json'
            );
        } catch (UnexpectedValueException) {
            return $this->jsonApi(
                errors: [self::BAD_REQUEST],
                status: 400
            );
        }

        $errors = $validator->validate(
            value: $jiraWorkLogRequest,
            groups: ['update']
        );

        if (\count($errors) > 0) {
            return $this->validationErrorJsonApi(
                constraintViolationList: $errors,
                status: 406
            );
        }

        try {
            $jiraWorkLog = $this->jiraWorkLogService->edit(
                id: $id,
                jiraWorkLogRequest: $jiraWorkLogRequest
            );
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_UPDATE_JIRA_WORK_LOG],
                status: 400
            );
        }

        if (!$jiraWorkLog instanceof JiraWorkLog) {
            return $this->jsonApi(
                errors: [self::JIRA_WORK_LOG_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi(
            $jiraWorkLog
        );
    }

    #[
        Route(
            path: '/{id}',
            name: 'delete-jira-work-log',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_DELETE],
            stateless: true,
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Delete(
            operationId: 'delete-jira-work-log',
            summary: 'Delete JiraWorkLog',
            tags: [self::OA_TAG],
        ),
        OA\Response(
            response: 204,
            description: 'JiraWorkLog deleted',
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
                            example: self::CANNOT_DELETE_JIRA_WORK_LOG
                        )
                    ),
                ]
            ),
        ),
        OA\Response(
            response: 404,
            description: self::JIRA_WORK_LOG_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::JIRA_WORK_LOG_NOT_FOUND
                        )
                    ),
                ]
            ),
        ),
    ]
    final public function delete(
        string $id
    ): JsonResponse
    {
        try {
            $status = $this->jiraWorkLogService->delete($id);
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_DELETE_JIRA_WORK_LOG],
                status: 400
            );
        }

        if (!$status) {
            return $this->jsonApi(
                errors: [self::JIRA_WORK_LOG_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi(
            status: 204
        );
    }
}
