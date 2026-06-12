<?php

declare(strict_types=1);

namespace App\Tests\Factory\Tag;

use App\Dto\Tag\TagRequest;
use App\Entity\Tag\Tag;
use App\Factory\Tag\TagFactory;
use PHPUnit\Framework\TestCase;

class TagFactoryTest extends TestCase
{
    public function testCreateBuildsNewTag(): void
    {
        $request = (new TagRequest())->setName('new-tag');

        $tag = TagFactory::create($request);

        self::assertSame('new-tag', $tag->getName());
    }

    public function testCreatePopulatesExistingTag(): void
    {
        $request = (new TagRequest())->setName('edited');
        $tag = (new Tag())->setName('old');

        $result = TagFactory::create($request, $tag);

        self::assertSame($tag, $result);
        self::assertSame('edited', $result->getName());
    }
}
