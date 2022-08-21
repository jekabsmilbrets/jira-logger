<?php

declare(strict_types=1);

namespace App\Controller\Web\Angular;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class AngularController extends AbstractController
{
    #[
        Route(
            path: '{ngPath}',
            name: 'app_web_angular',
            requirements: ['ngPath' => '^((?!(^\/api(.*)$)).)*$'],
            defaults: ['ngPath' => '/'],
            methods: ['GET']
        )
    ]
    final public function index(): Response
    {
        $projectDir = $this->getParameter('kernel.project_dir');

        return new Response(
            file_get_contents($projectDir . '/public/ng/index.html')
        );
    }
}
