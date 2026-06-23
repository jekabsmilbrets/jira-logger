<?php

declare(strict_types=1);

namespace App\Service\Task\JiraSync;

use App\Entity\Task\Task;
use App\Exception\JiraApiServiceException;

interface TaskJiraSyncAdapter
{
    /**
     * @throws JiraApiServiceException
     */
    public function syncTask(Task $task, string $date): bool;
}
