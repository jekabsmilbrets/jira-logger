<?php

declare(strict_types=1);

namespace App\Service\Task\TimeLog;

enum TimeLogWriteStatus
{
    case Created;
    case Updated;
    case Deleted;
    case NotFound;
    case Failed;
}
