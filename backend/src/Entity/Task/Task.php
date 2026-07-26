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
use Doctrine\ORM\Mapping as ORM;
use OpenApi\Attributes as OA;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\MaxDepth;

#[
    ORM\Entity(repositoryClass: TaskRepository::class),
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

    /** @var Collection<int, TimeLog> */
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

    /** @var Collection<int, Tag> */
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
    private Collection $tags;

    /** @var Collection<int, JiraWorkLog> */
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

    /** @return Collection<int, TimeLog> */
    final public function getTimeLogs(): Collection
    {
        return $this->timeLogs;
    }

    /** @param Collection<int, TimeLog> $timeLogs */
    final public function setTimeLogs(Collection $timeLogs): self
    {
        $this->timeLogs = $timeLogs;

        return $this;
    }

    /** @return Collection<int, Tag> */
    final public function getTags(): Collection
    {
        return $this->tags;
    }

    #[
        Groups([Group::LIST]),
        MaxDepth(1),
        OA\Property(ref: '#/components/schemas/TimeLogModel')
    ]
    final public function getLastTimeLog(): ?TimeLog
    {
        $timeLogs = $this->timeLogs->toArray();

        usort(
            $timeLogs,
            static function (TimeLog $left, TimeLog $right): int {
                $startTimeComparison = $right->getStartTime() <=> $left->getStartTime();

                if (0 !== $startTimeComparison) {
                    return $startTimeComparison;
                }

                return $right->getCreatedAt() <=> $left->getCreatedAt();
            }
        );

        foreach ($timeLogs as $timeLog) {
            if (null === $timeLog->getEndTime()) {
                return $timeLog;
            }
        }

        return $timeLogs[0] ?? null;
    }

    /** @return Collection<int, JiraWorkLog> */
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

    /**
     * @return array{
     *     id: string,
     *     name: ?string,
     *     description: ?string,
     *     timeLogs: Collection<int, TimeLog>,
     *     tags: Collection<int, Tag>,
     *     lastTimeLog: ?TimeLog,
     *     jiraWorkLogs: Collection<int, JiraWorkLog>
     * }
     */
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
