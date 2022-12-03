<?php

declare(strict_types=1);

namespace App\Dto\Setting;

use OpenApi\Attributes as OA;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

class SettingRequest
{
    #[
        Groups(['create', 'update']),
        Assert\NotNull,
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
            example: 'jire-host',
        )
    ]
    private string $name;

    #[
        Groups(['create', 'update']),
        Assert\NotNull,
        Assert\Length(
            min: 3,
            max: 512,
            groups: ['create', 'update'],
        ),
        Assert\Type(
            type: 'string',
            groups: ['create', 'update'],
        ),
        OA\Property(
            property: 'value',
            example: 'https://jira.com',
        )
    ]
    private string $value;

    final public function getName(): string
    {
        return $this->name;
    }

    final public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    final public function getValue(): string
    {
        return $this->value;
    }

    final public function setValue(string $value): self
    {
        $this->value = $value;

        return $this;
    }
}
