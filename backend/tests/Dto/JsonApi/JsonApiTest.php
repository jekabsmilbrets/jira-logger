<?php

declare(strict_types=1);

namespace App\Tests\Dto\JsonApi;

use App\Dto\JsonApi\JsonApi;
use PHPUnit\Framework\TestCase;

class JsonApiTest extends TestCase
{
    public function testJsonSerializeOmitsUnsetFields(): void
    {
        $dto = new JsonApi();
        $dto->setData(['id' => 1]);

        self::assertSame(['data' => ['id' => 1]], $dto->jsonSerialize());
    }

    public function testJsonSerializeIncludesMetaAndErrorsWhenSet(): void
    {
        $dto = new JsonApi();
        $dto->setMeta(['page' => 1])->setErrors(['oops']);

        self::assertSame(['meta' => ['page' => 1], 'errors' => ['oops']], $dto->jsonSerialize());
    }
}
