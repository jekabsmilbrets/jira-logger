<?php

declare(strict_types=1);

namespace App\Factory\JiraWorkLog;

use App\Dto\JiraWorkLog\JiraWorkLogRequest;
use App\Entity\JiraWorkLog\JiraWorkLog;

class JiraWorkLogFactory
{
    final public static function create(
        JiraWorkLogRequest $jiraWorkLogRequest,
        ?JiraWorkLog $jiraWorkLog = null,
    ): JiraWorkLog {
        if (null === $jiraWorkLog) {
            $jiraWorkLog = new JiraWorkLog();
        }

        if (null !== ($description = $jiraWorkLogRequest->getDescription())) {
            $jiraWorkLog->setDescription($description);
        }

        if (null !== ($task = $jiraWorkLogRequest->getTask())) {
            $jiraWorkLog->setTask($task);
        }

        if (null !== ($timeSpentSeconds = $jiraWorkLogRequest->getTimeSpentSeconds())) {
            $jiraWorkLog->setTimeSpentSeconds($timeSpentSeconds);
        }

        return $jiraWorkLog;
    }
}
