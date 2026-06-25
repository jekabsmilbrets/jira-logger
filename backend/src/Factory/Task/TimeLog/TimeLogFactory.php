<?php

declare(strict_types=1);

namespace App\Factory\Task\TimeLog;

use App\Dto\Task\TimeLog\TimeLogRequest;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Service\DateTime\DateInputParser;

class TimeLogFactory
{
    /**
     * @throws \Exception
     */
    final public static function create(
        TimeLogRequest $timeLogRequest,
        Task $task,
        DateInputParser $dateInputParser,
        ?TimeLog $timeLog = null,
    ): TimeLog {
        if (null === $timeLog) {
            $timeLog = new TimeLog();
        }

        if (null !== ($startTime = self::parseDateTime($dateInputParser, $timeLogRequest->getStartTime()))) {
            $timeLog->setStartTime($startTime);
        }

        if (null !== ($endTime = self::parseDateTime($dateInputParser, $timeLogRequest->getEndTime()))) {
            $timeLog->setEndTime($endTime);
        }

        if (null !== ($description = $timeLogRequest->getDescription())) {
            $timeLog->setDescription($description);
        }

        $timeLog->setTask($task);

        return $timeLog;
    }

    private static function parseDateTime(DateInputParser $dateInputParser, ?string $value): ?\DateTimeImmutable
    {
        if (null === $value || '' === trim($value)) {
            return null;
        }

        return $dateInputParser->parseDateTimeObject($value);
    }
}
