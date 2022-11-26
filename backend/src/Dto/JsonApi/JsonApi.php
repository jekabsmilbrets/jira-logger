<?php

declare(strict_types=1);

namespace App\Dto\JsonApi;

use OpenApi\Attributes as OA;
use Symfony\Component\Validator\Constraints as Assert;

class JsonApi implements \JsonSerializable
{
    #[
        Assert\Type(type: 'mixed'),
        OA\Property(type: 'mixed')
    ]
    public mixed $data = null;

    #[
        Assert\Type(type: 'mixed'),
        OA\Property(type: 'mixed')
    ]
    public mixed $errors = null;

    #[
        Assert\Type(type: 'mixed'),
        OA\Property(type: 'mixed')
    ]
    public mixed $meta = null;

    final public function getData(): mixed
    {
        return $this->data;
    }

    final public function setData(mixed $data): self
    {
        $this->data = $data;

        return $this;
    }

    final public function getErrors(): mixed
    {
        return $this->errors;
    }

    final public function setErrors(mixed $errors): self
    {
        $this->errors = $errors;

        return $this;
    }

    final public function getMeta(): mixed
    {
        return $this->meta;
    }

    final public function setMeta(mixed $meta): self
    {
        $this->meta = $meta;

        return $this;
    }

    final public function jsonSerialize(): array
    {
        $output = [];

        $keys = ['data', 'meta', 'errors'];

        foreach ($keys as $key) {
            if (
                isset($this->$key)
            ) {
                $output[$key] = $this->$key;
            }
        }

        return $output;
    }
}
