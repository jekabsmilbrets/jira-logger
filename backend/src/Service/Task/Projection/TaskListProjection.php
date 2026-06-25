<?php

declare(strict_types=1);

namespace App\Service\Task\Projection;

use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Service\Task\Filter\TaskFilterCriteria;
use App\Utility\TimeLog\TimeLogRange;
use Doctrine\Common\Collections\ArrayCollection;

final class TaskListProjection
{
    /**
     * @param Task[] $tasks
     *
     * @return Task[]
     */
    public function project(array $tasks, TaskFilterCriteria $criteria): array
    {
        $projectedTasks = new ArrayCollection($tasks);

        if (null !== $criteria->dateRange) {
            $projectedTasks = $projectedTasks->map(
                fn (Task $task): Task => $this->projectTimeLogsInRange($task, $criteria->dateRange)
            );
        }

        if ($criteria->hideUnreported) {
            $projectedTasks = $projectedTasks->filter(
                static fn (Task $task): bool => $task->getTimeLogs()->count() > 0
            );
        }

        return array_values($projectedTasks->toArray());
    }

    /**
     * @param array{startDate: \DateTimeImmutable, endDate: \DateTimeImmutable} $dateRange
     */
    private function projectTimeLogsInRange(Task $task, array $dateRange): Task
    {
        $startDate = $dateRange['startDate'];
        $endDate = $dateRange['endDate'];
        $timeLogs = $task->getTimeLogs()
            ->filter(
                static fn (TimeLog $timeLog): bool => TimeLogRange::overlaps(
                    $startDate,
                    $endDate,
                    $timeLog->getStartTime(),
                    $timeLog->getEndTime()
                )
            )
            ->map(
                static function (TimeLog $timeLog) use ($startDate, $endDate): TimeLog {
                    $startTime = $timeLog->getStartTime();
                    $endTime = $timeLog->getEndTime();

                    if ($startTime < $startDate) {
                        $timeLog->setOriginalStartTime($startTime);
                        $timeLog->setStartTime($startDate);
                        $timeLog->setManuallyModified(true);
                    }

                    if ($endTime > $endDate) {
                        $timeLog->setOriginalEndTime($endTime);
                        $timeLog->setEndTime($endDate);
                        $timeLog->setManuallyModified(true);
                    }

                    return $timeLog;
                }
            );

        $task->setTimeLogs(new ArrayCollection([...$timeLogs->toArray()]));

        return $task;
    }
}
