<?php

namespace App\Doctrine;

use Doctrine\ORM\EntityManager;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Mapping\Entity;
use Ramsey\Uuid\Doctrine\UuidGenerator;
use Ramsey\Uuid\Uuid;

class CustomUuidGenerator extends UuidGenerator
{
    /**
     * Generate a UUID for the entity.
     *
     * @param EntityManager|EntityManagerInterface $em
     * @param Entity $entity
     *
     * @return string
     */
    public function generateId(EntityManager|EntityManagerInterface $em, $entity): string
    {
        return Uuid::uuid4()->toString();
    }
}
