<?php

declare(strict_types=1);

namespace App\Entity\Setting;

use App\Repository\Setting\SettingRepository;
use App\Utility\Constants\Group;
use App\Utility\Entity\EntityBaseInterface;
use App\Utility\Traits\BaseEntityTrait;
use Doctrine\ORM\Mapping as ORM;
use OpenApi\Attributes as OA;
use Symfony\Component\Serializer\Attribute\Groups;
use Symfony\Component\Serializer\Attribute\Ignore;

#[
    ORM\Entity(repositoryClass: SettingRepository::class),
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
class Setting implements EntityBaseInterface
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
        ORM\Column(
            length: 512,
            unique: true
        ),
        OA\Property(
            type: 'string',
        )
    ]
    private ?string $value = null;

    /**
     * @return array{id: string, name: ?string}
     */
    final public function toArray(): array
    {
        return [
            'id' => $this->getId(),
            'name' => $this->getName(),
        ];
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

    #[Ignore]
    final public function getValue(): ?string
    {
        return $this->value;
    }

    final public function setValue(string $value): self
    {
        $this->value = $value;

        return $this;
    }
}
