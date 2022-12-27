<?php

declare(strict_types=1);

namespace App\Controller\API\Monitor;

use App\Controller\API\BaseApiController;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route(
    path: '/api',
    stateless: true
)]
class MonitorController extends BaseApiController
{
    final public const OA_TAG = 'Monitor';

    #[
        Route(
            path: '/monitor',
            name: 'monitor',
            methods: [Request::METHOD_GET],
            stateless: true,
        ),
        OA\Tag(name: self::OA_TAG),
        OA\Get(
            operationId: 'monitor',
            summary: 'Monitor lifeline of Jira-logger',
            tags: [self::OA_TAG],
            responses: [
                new OA\Response(
                    response: 200,
                    description: 'Returns the monitor time.',
                    content: new OA\JsonContent(
                        properties: [
                            new OA\Property(
                                property: 'data',
                                type: 'object',
                                example: [
                                    'time' => '2022-07-31T21:24:35',
                                    'message' => 'Welcome to Jira-logger API!',
                                ]
                            ),
                        ],
                    )
                ),
            ]
        )
    ]
    final public function monitor(): JsonResponse
    {
        return $this->jsonApi(
            [
                'time' => (new \DateTime())->format('Y-m-d\TH:i:sp'),
                'message' => 'Welcome to Jira-logger API!',
            ]
        );
    }
}
