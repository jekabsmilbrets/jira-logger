<?php

declare(strict_types=1);

namespace App\Controller\Web\Angular;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Annotation\Route;

#[Route(
    path: '/',
    stateless: true
)]
class AngularController extends AbstractController
{
    #[
        Route(
            path: '{ngPath}',
            name: 'app_web_angular',
            requirements: ['ngPath' => '^((?!(^\/api(.*)$)).)*$'],
            defaults: ['ngPath' => '/'],
            methods: [Request::METHOD_GET]
        )
    ]
    final public function index(): Response
    {
        $projectDir = $this->getParameter('kernel.project_dir');
        $file = new File($projectDir . '/public/ng/index.html');

        return $this->file(
            file: $file,
            disposition: ResponseHeaderBag::DISPOSITION_INLINE
        );
    }
}
