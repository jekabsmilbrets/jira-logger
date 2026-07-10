<?php

declare(strict_types=1);

namespace App\Service\Task\TimeLog;

use App\Dto\Task\TimeLog\TimeLogRequest;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Factory\Task\TimeLog\TimeLogFactory;
use App\Repository\Task\TimeLog\TimeLogRepository;
use App\Service\DateTime\DateInputParser;
use App\Service\DateTime\UserTimezoneResolver;
use App\Service\Task\TaskService;
use App\Utility\TimeLog\TimeLogDuration;
use Doctrine\DBAL\Exception;

class TimeLogService
{
    final public const NO_DATA_PROVIDED = 'No TimeLog Model or TimeLogRequest was provided';

    public function __construct(
        private readonly TimeLogRepository $timeLogRepository,
        private readonly TaskService $taskService,
        private readonly DateInputParser $dateInputParser,
        private readonly UserTimezoneResolver $userTimezoneResolver,
    ) {
    }

    /**
     * @return TimeLog[]|null
     */
    final public function list(
        string $taskId,
    ): ?array {
        $timeLogs = $this->timeLogRepository->findBy(
            [
                'task' => $taskId,
            ]
        );

        if (empty($timeLogs)) {
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
     * @throws \Exception
     */
    final public function create(
        TimeLogRequest $timeLogRequest,
        bool $flush = true,
    ): TimeLogWriteResult {
        $task = $this->task((string) $timeLogRequest->getTask());

        if (!$task instanceof Task) {
            return TimeLogWriteResult::notFound();
        }

        try {
            $timeLog = TimeLogFactory::create(
                timeLogRequest: $timeLogRequest,
                task: $task,
                dateInputParser: $this->dateInputParser()
            );
            $this->timeLogRepository->save(
                timeLog: $timeLog,
                flush: $flush
            );
        } catch (\Exception) {
            return TimeLogWriteResult::failed();
        }

        return TimeLogWriteResult::created($timeLog);
    }

    /**
     * @throws \Exception
     */
    final public function update(
        string $taskId,
        string $id,
        TimeLogRequest $timeLogRequest,
        bool $flush = true,
    ): TimeLogWriteResult {
        $timeLog = $this->timeLogRepository->findOneBy(
            [
                'id' => $id,
                'task' => $taskId,
            ]
        );

        if (!$timeLog instanceof TimeLog) {
            return TimeLogWriteResult::notFound();
        }

        $task = $this->task((string) $timeLogRequest->getTask());

        if (!$task instanceof Task) {
            return TimeLogWriteResult::notFound();
        }

        try {
            $timeLog = TimeLogFactory::create(
                timeLogRequest: $timeLogRequest,
                task: $task,
                dateInputParser: $this->dateInputParser(),
                timeLog: $timeLog
            );

            if ($flush) {
                $this->timeLogRepository->flush();
            }
        } catch (\Exception) {
            return TimeLogWriteResult::failed();
        }

        return TimeLogWriteResult::updated($timeLog);
    }

    final public function remove(
        string $taskId,
        string $id,
        bool $flush = true,
    ): TimeLogWriteResult {
        $timeLog = $this->timeLogRepository->findOneBy(
            [
                'id' => $id,
                'task' => $taskId,
            ]
        );

        if (!$timeLog instanceof TimeLog) {
            return TimeLogWriteResult::notFound();
        }

        try {
            $this->timeLogRepository->remove(
                timeLog: $timeLog,
                flush: $flush
            );
        } catch (\Exception) {
            return TimeLogWriteResult::failed();
        }

        return TimeLogWriteResult::deleted();
    }

    final public function start(
        string $taskId,
        bool $flush = true,
    ): TimeLogWriteResult {
        $task = $this->task($taskId);

        if (!$task instanceof Task) {
            return TimeLogWriteResult::notFound();
        }

        try {
            $timeLog = $this->startTaskTimeLog($task, $flush);
        } catch (\Exception) {
            return TimeLogWriteResult::failed();
        }

        return TimeLogWriteResult::created($timeLog);
    }

    final public function stop(
        string $taskId,
        bool $flush = true,
    ): TimeLogWriteResult {
        $task = $this->task($taskId);

        if (!$task instanceof Task) {
            return TimeLogWriteResult::notFound();
        }

        try {
            $timeLog = $this->stopTaskTimeLog($task, $flush);
        } catch (\Exception) {
            return TimeLogWriteResult::failed();
        }

        return $timeLog instanceof TimeLog ? TimeLogWriteResult::updated($timeLog) : TimeLogWriteResult::failed();
    }

    final public function activeTask(): ?Task
    {
        return $this->timeLogRepository
            ->findActive()
            ?->getTask();
    }

    final public function todayLoggedSeconds(?\DateTimeImmutable $now = null): int
    {
        [$rangeStart, $rangeEnd, $now] = $this->todayRange($now);
        $seconds = 0;

        foreach ($this->timeLogRepository->findOverlappingRange($rangeStart, $rangeEnd) as $timeLog) {
            $seconds += TimeLogDuration::clippedSecondsInRange(
                rangeStart: $rangeStart,
                rangeEnd: $rangeEnd,
                logStart: $timeLog->getStartTime(),
                logEnd: $timeLog->getEndTime() ?? $now,
            );
        }

        return $seconds;
    }

    /**
     * @throws \Exception
     */
    private function startTaskTimeLog(
        Task $task,
        bool $flush = true,
    ): TimeLog {
        $this->stopAllRunningTimeLogs();

        $timeLog = new TimeLog();
        $timeLog->setTask($task)
            ->setStartTime(new \DateTimeImmutable());

        $this->timeLogRepository->save($timeLog, $flush);

        return $timeLog;
    }

    /**
     * @throws \Exception
     */
    private function stopTaskTimeLog(
        Task $task,
        bool $flush = true,
    ): ?TimeLog {
        $timeLog = $task->getLastTimeLog();

        if (
            !$timeLog instanceof TimeLog ||
            null !== $timeLog->getEndTime()
        ) {
            return null;
        }

        $timeLog->setEndTime(new \DateTimeImmutable());

        if ($flush) {
            $this->timeLogRepository->flush();
        }

        return $timeLog;
    }

    /**
     * @throws Exception
     */
    final public function stopAllRunningTimeLogs(): int|string
    {
        return $this->timeLogRepository->stopAllRunningTimeLogs();
    }

    private function task(string $taskId): ?Task
    {
        return $this->taskService->show($taskId);
    }

    private function dateInputParser(): DateInputParser
    {
        return $this->dateInputParser;
    }

    /**
     * @return array{0: \DateTimeImmutable, 1: \DateTimeImmutable, 2: \DateTimeImmutable}
     */
    private function todayRange(?\DateTimeImmutable $now = null): array
    {
        $timezone = new \DateTimeZone($this->userTimezoneResolver->resolveCurrentUserTimezone());
        $utcTimezone = new \DateTimeZone('UTC');
        $now = ($now ?? new \DateTimeImmutable('now', $timezone))->setTimezone($timezone);
        $startOfToday = $now->setTime(0, 0);

        return [
            $startOfToday->setTimezone($utcTimezone),
            $startOfToday->modify('+1 day')->setTimezone($utcTimezone),
            $now->setTimezone($utcTimezone),
        ];
    }
}
