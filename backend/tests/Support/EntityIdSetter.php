<?php

declare(strict_types=1);

namespace App\Tests\Support;

trait EntityIdSetter
{
    private function setEntityId(object $entity, string $id): void
    {
        $reflection = new \ReflectionObject($entity);

        while ($reflection !== false) {
            if ($reflection->hasProperty('id')) {
                $property = $reflection->getProperty('id');
                $property->setValue($entity, $id);

                return;
            }

            $reflection = $reflection->getParentClass();
        }

        throw new \RuntimeException('id property not found');
    }
}
