<?php

declare(strict_types=1);

namespace App\Service\Task\JiraSync;

use App\Entity\Task\TimeLog\TimeLog;
use App\Utility\TimeLog\TimeLogDuration;
use App\Utility\TimeLog\TimeLogRange;
use Doctrine\Common\Collections\Collection;

final class JiraSyncTimeLogAggregation
{
    /**
     * @param Collection<int, TimeLog> $timeLogs
     *
     * @return array{int, string[]}
     */
    public function summarize(
        Collection $timeLogs,
        \DateTimeInterface $startDate,
        \DateTimeInterface $endDate,
    ): array {
        $timeSpentSeconds = 0;
        $descriptions = [];

        /** @var TimeLog $timeLog */
        foreach ($timeLogs->toArray() as $timeLog) {
            $startTime = $timeLog->getStartTime();
            $endTime = $timeLog->getEndTime();

            if (!TimeLogRange::overlaps($startDate, $endDate, $startTime, $endTime)) {
                continue;
            }

            $timeSpentSeconds += TimeLogDuration::clippedSecondsInRange(
                rangeStart: $startDate,
                rangeEnd: $endDate,
                logStart: $startTime,
                logEnd: $endTime,
            );

            if (!empty($description = $timeLog->getDescription())) {
                $descriptions[] = $description;
            }
        }

        return [$timeSpentSeconds, $descriptions];
    }
}
