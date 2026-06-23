<?php

declare(strict_types=1);

namespace App\Dto\Task;

use OpenApi\Attributes as OA;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Validator\Constraints as Assert;

class TaskRequest
{
    #[
        Groups(['create', 'update']),
        Assert\NotNull(groups: ['create', 'update']),
        Assert\NotBlank(groups: ['create', 'update']),
        Assert\Length(
            min: 3,
            max: 255,
            groups: ['create', 'update'],
        ),
        Assert\Type(
            type: 'string',
            groups: ['create', 'update'],
        ),
        OA\Property(
            property: 'name',
            example: 'JIRA-RE-DOCKER-1',
        )
    ]
    private ?string $name = null;

    #[
        Groups(['create', 'update']),
        Assert\Length(
            max: 255,
            groups: ['create', 'update'],
        ),
        Assert\Type(
            type: 'string',
            groups: ['create', 'update'],
        ),
        OA\Property(example: 'JIRA-RE-DOCKER-1 Technical idea')
    ]
    private ?string $description = null;

    /**
     * @var string[]|null
     */
    #[
        Groups(['create', 'update']),
        Assert\All(
            constraints: [
                new Assert\Type('string'),
            ],
            groups: ['create', 'update'],
        ),
        OA\Property(
            type: 'array',
            items: new OA\Items(type: 'uuid'),
            example: '["9dab258b-46ff-4ad7-a8a0-b9f2b6f84aa1"]',
        )
    ]
    private ?array $tags = null;

    final public function getName(): ?string
    {
        return $this->name;
    }

    final public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    final public function getDescription(): ?string
    {
        return $this->description;
    }

    final public function setDescription(?string $description): self
    {
        $this->description = $description;

        return $this;
    }

    /**
     * @return string[]|null
     */
    final public function getTagIds(): ?array
    {
        return $this->tags;
    }

    /**
     * @param string[] $tagIds
     */
    final public function setTags(array $tagIds): self
    {
        $this->tags = $tagIds;

        return $this;
    }
}
