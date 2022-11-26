<?php

declare(strict_types=1);

namespace App\Entity\Task;

use App\Entity\JiraWorkLog\JiraWorkLog;
use App\Entity\Tag\Tag;
use App\Entity\Task\TimeLog\TimeLog;
use App\Repository\Task\TaskRepository;
use App\Utility\Constants\Group;
use App\Utility\Entity\EntityBaseInterface;
use App\Utility\Traits\BaseEntityTrait;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\Common\Collections\Criteria;
use Doctrine\ORM\Mapping as ORM;
use OpenApi\Attributes as OA;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Serializer\Annotation\MaxDepth;

#[
    ORM\Entity(repositoryClass: TaskRepository::class),
    ORM\Table(
        uniqueConstraints: [
            new ORM\UniqueConstraint(
                columns: [
                    'name',
                ]
            ),
        ]
    ),
    ORM\HasLifecycleCallbacks,
]
class Task implements EntityBaseInterface
{
    use BaseEntityTrait;

    #[
        Groups([Group::LIST]),
        ORM\Column(
            length: 255,
            unique: true
        ),
        OA\Property(
            type: 'string',
        )
    ]
    private ?string $name = null;

    #[
        Groups([Group::LIST]),
        ORM\Column(
            length: 255,
            nullable: true
        ),
        OA\Property(
            type: 'string',
        )
    ]
    private ?string $description = null;

    #[
        Groups([Group::LIST]),
        MaxDepth(1),
        ORM\OneToMany(
            mappedBy: 'task',
            targetEntity: TimeLog::class,
            cascade: [
                'persist',
                'remove',
            ],
            orphanRemoval: true
        ),
        ORM\JoinColumn(
            onDelete: 'CASCADE'
        ),
        OA\Property(
            type: 'array',
            items: new OA\Items(ref: '#/components/schemas/TimeLogModel')
        )
    ]
    private Collection $timeLogs;

    #[
        Groups([Group::LIST]),
        MaxDepth(1),
        ORM\ManyToMany(
            targetEntity: Tag::class,
            mappedBy: 'tasks',
        ),
        OA\Property(
            type: 'array',
            items: new OA\Items(ref: '#/components/schemas/TagModel')
        )
    ]
    private ?Collection $tags;

    #[
        Groups([Group::LIST]),
        MaxDepth(1),
        OA\Property(ref: '#/components/schemas/TimeLogModel')
    ]
    private ?TimeLog $lastTimeLog = null;

    #[
        Groups([Group::LIST]),
        MaxDepth(1),
        ORM\OneToMany(
            mappedBy: 'task',
            targetEntity: JiraWorkLog::class,
            orphanRemoval: true
        ),
        OA\Property(
            type: 'array',
            items: new OA\Items(ref: '#/components/schemas/JiraWorkLogModel')
        )
    ]
    private Collection $jiraWorkLogs;

    public function __construct()
    {
        $this->timeLogs = new ArrayCollection();
        $this->tags = new ArrayCollection();
        $this->jiraWorkLogs = new ArrayCollection();
    }

    final public function addTimeLog(TimeLog $timeLog): self
    {
        if (!$this->timeLogs->contains($timeLog)) {
            $this->timeLogs->add($timeLog);
            $timeLog->setTask($this);
        }

        return $this;
    }

    final public function removeTimeLog(TimeLog $timeLog): self
    {
        // set the owning side to null (unless already changed)
        if ($this->timeLogs->removeElement($timeLog) && $timeLog->getTask() === $this) {
            $timeLog->setTask(null);
        }

        return $this;
    }

    final public function addTag(Tag $tag): self
    {
        if (!$this->tags->contains($tag)) {
            $this->tags->add($tag);
            $tag->addTask($this);
        }

        return $this;
    }

    final public function removeTag(Tag $tag): self
    {
        if ($this->tags->removeElement($tag)) {
            $tag->removeTask($this);
        }

        return $this;
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

    final public function getTimeLogs(): Collection
    {
        return $this->timeLogs;
    }

    final public function setTimeLogs(Collection $timeLogs): self
    {
        $this->timeLogs = $timeLogs;

        return $this;
    }

    final public function getTags(): Collection
    {
        return $this->tags;
    }

    final public function getLastTimeLog(): ?TimeLog
    {
        $criteria = Criteria::create()
            ->orderBy(
                [
                    'createdAt' => 'DESC',
                    'updatedAt' => 'DESC',
                ]
            );

        $timeLog = $this->timeLogs->matching($criteria)->first();

        return $timeLog instanceof TimeLog ? $timeLog : null;
    }

    final public function getJiraWorkLogs(): Collection
    {
        return $this->jiraWorkLogs;
    }

    final public function addJiraWorkLog(JiraWorkLog $jiraWorkLog): self
    {
        if (!$this->jiraWorkLogs->contains($jiraWorkLog)) {
            $this->jiraWorkLogs->add($jiraWorkLog);
            $jiraWorkLog->setTask($this);
        }

        return $this;
    }

    final public function removeJiraWorkLog(JiraWorkLog $jiraWorkLog): self
    {
        if ($this->jiraWorkLogs->removeElement($jiraWorkLog)) {
            // set the owning side to null (unless already changed)
            if ($jiraWorkLog->getTask() === $this) {
                $jiraWorkLog->setTask(null);
            }
        }

        return $this;
    }

    final public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'name' => $this->getName(),
            'description' => $this->getDescription(),
            'timeLogs' => $this->getTimeLogs(),
            'tags' => $this->getTags(),
            'lastTimeLog' => $this->getLastTimeLog(),
            'jiraWorkLogs' => $this->getJiraWorkLogs(),
        ];
    }
}
