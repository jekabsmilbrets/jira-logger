<?php

declare(strict_types=1);

namespace App\Factory\Tag;

use App\Dto\Tag\TagRequest;
use App\Entity\Tag\Tag;

class TagFactory
{
    final public static function create(
        TagRequest $tagRequest,
        Tag $tag = null,
    ): Tag {
        if (null === $tag) {
            $tag = new Tag();
        }

        if (null !== ($name = $tagRequest->getName())) {
            $tag->setName($name);
        }

        return $tag;
    }
}
