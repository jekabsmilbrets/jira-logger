<?php

declare(strict_types=1);

namespace App\Service\Task\Write;

enum TaskWriteStatus
{
    case Created;
    case Updated;
    case Deleted;
    case NotFound;
    case Duplicate;
    case Failed;
}
