<?php

declare(strict_types=1);

namespace App\Entity\Tag;

use App\Entity\Task\Task;
use App\Repository\Tag\TagRepository;
use App\Utility\Constants\Group;
use App\Utility\Entity\EntityBaseInterface;
use App\Utility\Traits\BaseEntityTrait;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use OpenApi\Attributes as OA;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Serializer\Annotation\Ignore;
use Symfony\Component\Serializer\Annotation\MaxDepth;

#[
    ORM\Entity(repositoryClass: TagRepository::class),
    ORM\HasLifecycleCallbacks
]
class Tag implements EntityBaseInterface
{
    use BaseEntityTrait;

    #[
        Groups([Group::LIST]),
        ORM\Column(
            length: 255,
            unique: true,
        ),
        OA\Property(
            type: 'string',
        )
    ]
    private ?string $name = null;

    #[
        Groups([Group::DEEP]),
        MaxDepth(1),
        Ignore,
        ORM\ManyToMany(
            targetEntity: Task::class,
            inversedBy: 'tags'
        ),
        OA\Property(
            type: 'array',
            items: new OA\Items(ref: '#/components/schemas/TaskModel')
        ),
    ]
    private Collection $tasks;

    public function __construct()
    {
        $this->tasks = new ArrayCollection();
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

    final public function getTasks(): Collection
    {
        return $this->tasks;
    }

    final public function addTask(Task $task): self
    {
        if (!$this->tasks->contains($task)) {
            $this->tasks->add($task);
        }

        return $this;
    }

    final public function removeTask(Task $task): self
    {
        $this->tasks->removeElement($task);

        return $this;
    }
}
