<?php

declare(strict_types=1);

use Rector\Php55\Rector\String_\StringClassNameToClassConstantRector;
use Symfony\Component\DependencyInjection\Container;
use Symfony\Component\Routing\RouterInterface;
use Psr\Container\ContainerInterface;
use Rector\CodeQuality\Rector\Class_\InlineConstructorDefaultToPropertyRector;
use Rector\Config\RectorConfig;
use Rector\Set\ValueObject\LevelSetList;
use Rector\Set\ValueObject\SetList;
use Rector\Symfony\Set\SymfonySetList;

return static function (RectorConfig $rectorConfig): void {
    $rectorConfig->importNames();
    $rectorConfig->paths([
                             __DIR__ . '/src',
                         ]);

    $rectorConfig->sets([
                            LevelSetList::UP_TO_PHP_81,
                            SetList::CODE_QUALITY,
                            SetList::DEAD_CODE,
                            SetList::NAMING,
                            SymfonySetList::SYMFONY_60,
                        ]);
};
