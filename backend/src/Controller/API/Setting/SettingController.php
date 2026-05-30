<?php

declare(strict_types=1);

namespace App\Controller\API\Setting;

use App\Controller\API\BaseApiController;
use App\Dto\Setting\SettingRequest;
use App\Entity\Setting\Setting;
use App\Service\Setting\SettingService;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Exception;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Routing\Requirement\Requirement;
use Symfony\Component\Serializer\Exception\UnexpectedValueException;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route(
    path: '/api/setting',
    stateless: true
)]
class SettingController extends BaseApiController
{
    final public const SETTING_NOT_FOUND = 'Setting not found';
    final public const SETTINGS_NOT_FOUND = 'Settings not found';
    final public const CANNOT_CREATE_SETTING = 'Can not Create Setting';
    final public const CANNOT_DELETE_SETTING = 'Can not Delete Setting';
    final public const CANNOT_UPDATE_SETTING = 'Can not Update Setting';
    final public const DUPLICATE_SETTING_NAME = 'Duplicate Setting name';
    final public const SETTING_MANAGED_EXTERNALLY = 'This setting is managed via secret storage. Rotate JIRA token through JIRA_PERSONAL_ACCESS_TOKEN and restart the backend.';

    final public const OA_TAG = 'Settings';
    final public const MODEL_SCHEMA = '#/components/schemas/SettingModel';
    private const REDACTED_VALUE = '***REDACTED***';
    private const SECRET_NAME_PARTS = ['token', 'password', 'secret', 'key'];
    private const EXTERNALLY_MANAGED_SETTING_NAMES = []; // ['jira.personal-access-token'];

    public function __construct(
        private readonly SettingService $settingService,
    ) {
    }

    #[
        Route(
            path: '',
            name: 'list-settings',
            methods: [Request::METHOD_GET],
            stateless: true
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Get(
            operationId: 'list-settings',
            summary: 'List Settings',
            tags: [self::OA_TAG],
        ),
        OA\Response(
            response: 200,
            description: 'Returns list of Settings.',
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
            description: self::SETTINGS_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::SETTINGS_NOT_FOUND
                        )
                    ),
                ]
            ),
        ),
    ]
    final public function list(): JsonResponse
    {
        $settings = $this->settingService->list();

        if (null === $settings) {
            return $this->jsonApi(
                errors: [self::SETTINGS_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi($this->sanitizeSettingsCollection($settings));
    }

    #[
        Route(
            path: '/{id}',
            name: 'show-setting',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_GET],
            stateless: true,
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Get(
            operationId: 'show-setting',
            summary: 'Show Setting',
            tags: [self::OA_TAG]
        ),
        OA\Response(
            response: 200,
            description: 'Returns Setting',
            content: new OA\JsonContent(ref: self::MODEL_SCHEMA),
        ),
        OA\Response(
            response: 404,
            description: self::SETTING_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::SETTING_NOT_FOUND
                        )
                    ),
                ]
            ),
        ),
    ]
    final public function show(
        string $id
    ): JsonResponse {
        $setting = $this->settingService->show($id);

        if (!$setting instanceof Setting) {
            return $this->jsonApi(
                errors: [self::SETTING_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi($this->sanitizeSetting($setting));
    }

    #[
        Route(
            path: '',
            name: 'create-setting',
            methods: [Request::METHOD_POST],
            stateless: true
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Post(
            operationId: 'create-setting',
            summary: 'Create a new Setting',
            tags: [self::OA_TAG],
        ),
        OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/SettingCreateRequest')
        ),
        OA\Response(
            response: 200,
            description: 'Setting created successfully',
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
                            example: self::DUPLICATE_SETTING_NAME
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
            $settingRequest = $this->deserializeJsonRequest(
                serializer: $serializer,
                request: $request,
                type: SettingRequest::class,
            );
        } catch (UnexpectedValueException) {
            return $this->badRequestJsonApi();
        }

        $validationError = $this->validateRequestDto(
            validator: $validator,
            requestDto: $settingRequest,
            group: 'create',
            status: 406,
        );

        if ($validationError instanceof JsonResponse) {
            return $validationError;
        }

        if ($this->isExternallyManagedSettingName($settingRequest->getName())) {
            return $this->jsonApi(
                errors: [self::SETTING_MANAGED_EXTERNALLY],
                status: 400
            );
        }

        try {
            $setting = $this->settingService->new($settingRequest);
        } /* @noinspection PhpRedundantCatchClauseInspection */ catch (UniqueConstraintViolationException) {
            return $this->jsonApi(
                errors: [self::DUPLICATE_SETTING_NAME],
                status: 400
            );
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_CREATE_SETTING],
                status: 400
            );
        }

        return $this->jsonApi(
            $setting
        );
    }

    #[
        Route(
            path: '/{id}',
            name: 'edit-setting',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_PATCH],
            stateless: true,
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Patch(
            operationId: 'edit-setting',
            summary: 'Edit Setting',
            tags: [self::OA_TAG],
        ),
        OA\RequestBody(
            content: new OA\JsonContent(ref: '#/components/schemas/SettingUpdateRequest')
        ),
        OA\Response(
            response: 200,
            description: 'Returns Setting',
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
            description: self::SETTING_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::SETTING_NOT_FOUND
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
            $settingRequest = $this->deserializeJsonRequest(
                serializer: $serializer,
                request: $request,
                type: SettingRequest::class,
            );
        } catch (UnexpectedValueException) {
            return $this->badRequestJsonApi();
        }

        $validationError = $this->validateRequestDto(
            validator: $validator,
            requestDto: $settingRequest,
            group: 'update',
            status: 406,
        );

        if ($validationError instanceof JsonResponse) {
            return $validationError;
        }

        if ($this->isExternallyManagedSettingName($settingRequest->getName())) {
            return $this->jsonApi(
                errors: [self::SETTING_MANAGED_EXTERNALLY],
                status: 400
            );
        }

        try {
            $setting = $this->settingService->edit(
                id: $id,
                settingRequest: $settingRequest
            );
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_UPDATE_SETTING],
                status: 400
            );
        }

        if (!$setting instanceof Setting) {
            return $this->jsonApi(
                errors: [self::SETTING_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi(
            $setting
        );
    }

    #[
        Route(
            path: '/{id}',
            name: 'delete-setting',
            requirements: ['id' => Requirement::UUID],
            methods: [Request::METHOD_DELETE],
            stateless: true,
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Delete(
            operationId: 'delete-setting',
            summary: 'Delete Setting',
            tags: [self::OA_TAG],
        ),
        OA\Response(
            response: 204,
            description: 'Setting deleted',
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
                            example: self::CANNOT_DELETE_SETTING
                        )
                    ),
                ]
            ),
        ),
        OA\Response(
            response: 404,
            description: self::SETTING_NOT_FOUND,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'errors',
                        type: 'array',
                        items: new OA\Items(
                            type: 'string',
                            example: self::SETTING_NOT_FOUND
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
            $status = $this->settingService->delete($id);
        } catch (Exception) {
            return $this->jsonApi(
                errors: [self::CANNOT_DELETE_SETTING],
                status: 400
            );
        }

        if (!$status) {
            return $this->jsonApi(
                errors: [self::SETTING_NOT_FOUND],
                status: 404
            );
        }

        return $this->jsonApi(
            status: 204
        );
    }

    private function sanitizeSettingsCollection(iterable $settings): array
    {
        $sanitized = [];

        foreach ($settings as $setting) {
            if ($setting instanceof Setting) {
                $sanitized[] = $this->sanitizeSetting($setting);
            }
        }

        return $sanitized;
    }

    private function sanitizeSetting(Setting $setting): array
    {
        $value = $setting->getValue();
        $name = mb_strtolower($setting->getName() ?? '');

        foreach (self::SECRET_NAME_PARTS as $part) {
            if (str_contains($name, $part)) {
                $value = self::REDACTED_VALUE;
                break;
            }
        }

        return [
            'id' => $setting->getId(),
            'name' => $setting->getName(),
            'value' => $value,
        ];
    }

    private function isExternallyManagedSettingName(string $settingName): bool
    {
        return \in_array(mb_strtolower($settingName), self::EXTERNALLY_MANAGED_SETTING_NAMES, true);
    }
}
