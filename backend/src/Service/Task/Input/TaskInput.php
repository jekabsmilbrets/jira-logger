<?php

declare(strict_types=1);

namespace App\Service\Task\Input;

use App\Entity\Tag\Tag;
use Doctrine\Common\Collections\Collection;

final readonly class TaskInput
{
    /**
     * @param Collection<int, Tag>|null $tags
     */
    public function __construct(
        public ?string $name,
        public ?string $description,
        public ?Collection $tags,
    ) {
    }
}
