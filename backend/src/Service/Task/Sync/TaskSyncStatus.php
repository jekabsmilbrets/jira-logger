<?php

declare(strict_types=1);

namespace App\Service\Task\Sync;

enum TaskSyncStatus
{
    case Synced;
    case Conflict;
    case NotFound;
    case Failed;
}
