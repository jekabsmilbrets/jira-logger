<?php

declare(strict_types=1);

namespace App\Tests\Controller\API\Tag;

use App\Controller\API\Tag\TagController;
use App\Entity\Tag\Tag;
use App\Repository\Tag\TagRepository;
use App\Service\Tag\TagService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\Container;

class TagControllerTest extends TestCase
{
    private function controllerWith(TagRepository $repository): TagController
    {
        $controller = new TagController(new TagService($repository));
        $controller->setContainer(new Container());

        return $controller;
    }

    public function testListReturnsNotFoundWhenServiceReturnsNull(): void
    {
        $repository = $this->createMock(TagRepository::class);
        $repository->method('findAll')->willReturn([]);

        $response = $this->controllerWith($repository)->list();

        self::assertSame(404, $response->getStatusCode());
    }

    public function testShowReturnsOkWhenTagFound(): void
    {
        $tag = (new Tag())->setName('ops');
        $repository = $this->createMock(TagRepository::class);
        $repository->method('find')->willReturn($tag);

        $response = $this->controllerWith($repository)->show('id');

        self::assertSame(200, $response->getStatusCode());
        self::assertStringContainsString('"name":"ops"', (string) $response->getContent());
    }
}
