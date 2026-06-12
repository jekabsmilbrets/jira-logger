<?php

declare(strict_types=1);

namespace App;

use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;

class Kernel extends BaseKernel
{
    use MicroKernelTrait;

    final public function boot(): void
    {
        parent::boot();

        $internalTimezone = $_SERVER['APP_INTERNAL_TIMEZONE']
            ?? $_ENV['APP_INTERNAL_TIMEZONE']
            ?? 'UTC';

        date_default_timezone_set($internalTimezone);
    }
}
