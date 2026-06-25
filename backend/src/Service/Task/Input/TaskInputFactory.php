<?php

declare(strict_types=1);

namespace App\Service\Task\Input;

use App\Entity\Tag\Tag;
use App\Service\Tag\TagService;
use Doctrine\Common\Collections\ArrayCollection;

final readonly class TaskInputFactory
{
    public function __construct(
        private TagService $tagService,
    ) {
    }

    /**
     * @param string[]|null $tagIds
     */
    public function create(?string $name, ?string $description, ?array $tagIds): TaskInput
    {
        return new TaskInput(
            name: $name,
            description: $description,
            tags: $this->resolveTags($tagIds),
        );
    }

    /**
     * @param string[]|null $tagIds
     *
     * @return ArrayCollection<int, Tag>|null
     */
    private function resolveTags(?array $tagIds): ?ArrayCollection
    {
        if (null === $tagIds) {
            return null;
        }

        $tags = new ArrayCollection([]);

        if ([] === $tagIds) {
            return $tags;
        }

        return $this->tagService->findByIds($tagIds);
    }
}
