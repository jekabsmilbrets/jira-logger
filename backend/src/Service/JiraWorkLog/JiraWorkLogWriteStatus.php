<?php

declare(strict_types=1);

namespace App\Service\JiraWorkLog;

enum JiraWorkLogWriteStatus
{
    case Created;
    case Updated;
    case Deleted;
    case Duplicate;
    case NotFound;
    case Failed;
}
