<?php

declare(strict_types=1);

namespace App\Service\Task\TimeLog;

use App\Dto\Task\TimeLog\TimeLogRequest;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Factory\Task\TimeLog\TimeLogFactory;
use App\Repository\Task\TimeLog\TimeLogRepository;
use DateTime;
use Exception;
use RuntimeException;

class TimeLogService
{
    final public const NO_DATA_PROVIDED = 'No TimeLog Model or TimeLogRequest was provided';

    public function __construct(
        private readonly TimeLogRepository $timeLogRepository,
    ) {
    }

    final public function list(
        string $taskId,
    ): ?array {
        $timeLogs = $this->timeLogRepository->findBy(
            [
                'task' => $taskId,
            ]
        );

        if (empty($timeLogs) || [] === $timeLogs) {
            return null;
        }

        return $timeLogs;
    }

    final public function show(
        string $taskId,
        string $id
    ): ?TimeLog {
        $timeLog = $this->timeLogRepository->findOneBy(
            [
                'id' => $id,
                'task' => $taskId,
            ]
        );

        return $timeLog ?? null;
    }

    /**
     * @throws Exception
     */
    final public function startTaskTimeLog(
        Task $task,
        bool $flush = true,
    ): ?TimeLog {
        $timeLog = new TimeLog();
        $timeLog->setTask($task)
            ->setStartTime(new DateTime());

        return $this->new(
            timeLog: $timeLog,
            flush: $flush
        );
    }

    /**
     * @throws Exception
     */
    final public function new(
        ?TimeLogRequest $timeLogRequest = null,
        ?TimeLog        $timeLog = null,
        bool            $flush = true,
    ): TimeLog {
        if (!$timeLogRequest && !$timeLog) {
            throw new RuntimeException(self::NO_DATA_PROVIDED);
        }

        if ($timeLogRequest && !$timeLog) {
            $timeLog = TimeLogFactory::create($timeLogRequest);
        }

        $this->timeLogRepository->add(
            timeLog: $timeLog,
            flush: $flush
        );

        return $timeLog;
    }

    /**
     * @throws Exception
     */
    final public function stopTaskTimeLog(
        Task $task,
        bool $flush = true,
    ): ?TimeLog {
        $timeLog = $task->getLastTimeLog();

        if (
            !$timeLog instanceof TimeLog |
            null !== $timeLog->getEndTime()
        ) {
            return null;
        }

        $timeLog->setEndTime(new DateTime());

        return $this->edit(
            taskId: $task->getId(),
            id: $timeLog->getId(),
            timeLog: $timeLog,
            flush: $flush
        );
    }

    /**
     * @throws Exception
     */
    final public function edit(
        string          $taskId,
        string          $id,
        ?TimeLogRequest $timeLogRequest = null,
        ?TimeLog        $timeLog = null,
        bool            $flush = true,
    ): ?TimeLog {
        switch (true) {
            case !$timeLogRequest && !$timeLog:
                throw new RuntimeException(self::NO_DATA_PROVIDED);
            case (!$timeLogRequest && $timeLog) && !$timeLog instanceof TimeLog:
                return null;

            case $timeLogRequest && !$timeLog:
                $timeLog = $this->timeLogRepository->findOneBy(
                    [
                        'id' => $id,
                        'task' => $taskId,
                    ]
                );

                if (!$timeLog instanceof TimeLog) {
                    return null;
                }

                $timeLog = TimeLogFactory::create(
                    timeLogRequest: $timeLogRequest,
                    timeLog: $timeLog
                );
                break;

            case $timeLogRequest && $timeLog:
                if (!$timeLog instanceof TimeLog) {
                    return null;
                }

                $timeLog = TimeLogFactory::create(
                    timeLogRequest: $timeLogRequest,
                    timeLog: $timeLog
                );
        }

        if ($flush) {
            $this->timeLogRepository->flush();
        }

        return $timeLog;
    }

    final public function delete(
        string $taskId,
        string $id,
        bool   $flush = true,
    ): bool {
        $timeLog = $this->timeLogRepository->findOneBy(
            [
                'id' => $id,
                'task' => $taskId,
            ]
        );

        if (!$timeLog instanceof TimeLog) {
            return false;
        }

        $this->timeLogRepository->remove(
            timeLog: $timeLog,
            flush: $flush
        );

        return true;
    }
}
