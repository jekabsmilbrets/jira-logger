<?php

declare(strict_types=1);

namespace App\Dto\Tag;

use OpenApi\Attributes as OA;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

class TagRequest
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
            example: 'CAPEX',
        )
    ]
    private string $name;

    final public function getName(): string
    {
        return $this->name;
    }

    final public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }
}
