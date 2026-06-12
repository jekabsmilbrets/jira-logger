<?php

declare(strict_types=1);

namespace App\Tests\Dto\Tag;

use App\Dto\Tag\TagRequest;
use PHPUnit\Framework\TestCase;

class TagRequestTest extends TestCase
{
    public function testNameRoundTrip(): void
    {
        $request = (new TagRequest())->setName('capex');

        self::assertSame('capex', $request->getName());
    }
}
