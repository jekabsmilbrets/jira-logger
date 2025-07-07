<?php

declare(strict_types=1);

namespace App\Factory\Task\TimeLog;

use App\Dto\Task\TimeLog\TimeLogRequest;
use App\Entity\Task\TimeLog\TimeLog;

class TimeLogFactory
{
    /**
     * @throws \Exception
     */
    final public static function create(
        TimeLogRequest $timeLogRequest,
        ?TimeLog $timeLog = null,
    ): TimeLog {
        if (null === $timeLog) {
            $timeLog = new TimeLog();
        }

        if (null !== ($startTime = $timeLogRequest->getStartTime())) {
            $timeLog->setStartTime(new \DateTime($startTime));
        }

        if (null !== ($endTime = $timeLogRequest->getEndTime())) {
            $timeLog->setEndTime(new \DateTime($endTime));
        }

        if (null !== ($description = $timeLogRequest->getDescription())) {
            $timeLog->setDescription($description);
        }

        if (null !== ($task = $timeLogRequest->getTask())) {
            $timeLog->setTask($task);
        }

        return $timeLog;
    }
}
