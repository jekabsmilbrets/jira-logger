<?php

declare(strict_types=1);

namespace App\Dto\Task;

use App\Entity\Tag\Tag;
use App\Service\Tag\TagService;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use OpenApi\Attributes as OA;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

class TaskRequest
{
    #[
        Groups(['update']),
        Assert\NotNull(groups: ['update']),
        Assert\Type(
            type: 'string',
            groups: ['update'],
        ),
        OA\Property(
            property: 'id',
            type: 'uuid',
            example: '9dab258b-46ff-4ad7-a8a0-b9f2b6f84aa1',
            nullable: false,
        )
    ]
    public ?string $id = null;

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

    #[
        Groups(['create', 'update']),
        Assert\All(
            constraints: [
                new Assert\Type(Tag::class),
            ],
            groups: ['create', 'update'],
        ),
        OA\Property(
            type: 'array',
            items: new OA\Items(type: 'uuid'),
            example: '["9dab258b-46ff-4ad7-a8a0-b9f2b6f84aa1"]',
        )
    ]
    private ?Collection $tags = null;

    public function __construct(
        private readonly TagService $tagService,
    ) {
    }

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

    final public function getTags(): ?Collection
    {
        return $this->tags;
    }

    final public function setTags(array $tagIds): self
    {
        $tags = new ArrayCollection([]);

        foreach ($this->tagService->list() as $tag) {
            $tagInTags = $tags->contains($tag);

            if (in_array($tag->getId(), $tagIds, true)) {
                if (!$tagInTags) {
                    $tags->add($tag);
                }
            } else if ($tagInTags) {
                $tags->removeElement($tag);
            }
        }

        $this->tags = $tags;

        return $this;
    }

    final public function getId(): ?string
    {
        return $this->id;
    }

    final public function setId(string $id): self
    {
        $this->id = $id;

        return $this;
    }
}
