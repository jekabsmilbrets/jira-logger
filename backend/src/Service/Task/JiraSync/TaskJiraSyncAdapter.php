<?php

declare(strict_types=1);

namespace App\Service\Task\JiraSync;

use App\Entity\Task\Task;

interface TaskJiraSyncAdapter
{
    /**
     * @throws TaskJiraSyncException
     */
    public function syncTask(Task $task, string $date): bool;
}
