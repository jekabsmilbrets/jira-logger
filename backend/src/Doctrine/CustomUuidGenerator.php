<?php

declare(strict_types=1);

namespace App\Doctrine;

use Doctrine\ORM\EntityManagerInterface;
use Ramsey\Uuid\Doctrine\UuidGenerator;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

class CustomUuidGenerator extends UuidGenerator
{
    public function generateId(EntityManagerInterface $em, $entity): UuidInterface
    {
        return Uuid::uuid4();
    }
}
