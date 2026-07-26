<?php

declare(strict_types=1);

namespace App\Service\Task\JiraSync;

use App\Dto\Task\JiraTaskSearchRequest;
use App\Entity\JiraWorkLog\JiraWorkLog;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Exception\JiraApiServiceException;
use App\Repository\JiraWorkLog\JiraWorkLogRepository;
use App\Repository\Task\TaskRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\DateTime\UserTimezoneResolver;
use App\Service\JiraApi\JiraApiService;
use App\Service\Task\Sync\TaskSyncResult;
use App\Utility\TimeLog\TimeLogDuration;
use App\Utility\TimeLog\TimeLogRange;
use Doctrine\Common\Collections\Collection;

class JiraTaskSyncService
{
    public function __construct(
        private readonly JiraApiService $jiraApiService,
        private readonly JiraWorkLogRepository $jiraWorkLogRepository,
        private readonly TaskFilterDateRangeResolver $taskFilterDateRangeResolver,
        private readonly UserTimezoneResolver $userTimezoneResolver,
        private readonly TaskRepository $taskRepository,
    ) {
    }

    public function syncTask(string $id, string $date): TaskSyncResult
    {
        $task = $this->taskRepository->find($id);

        if (!$task instanceof Task) {
            return TaskSyncResult::notFound();
        }

        try {
            $this->sync($task, $date);
        } catch (JiraApiServiceException $e) {
            return TaskSyncResult::failed($e->getMessage());
        }

        return TaskSyncResult::synced();
    }

    /**
     * @return array{
     *     data: list<array{key: string, summary: string, status: string, issueType: string, updated: ?string}>,
     *     truncated: bool
     * }
     *
     * @throws JiraApiServiceException
     */
    public function findMissingTasks(JiraTaskSearchRequest $request): array
    {
        $knownKeys = [];

        foreach ($this->taskRepository->findAll() as $task) {
            $issueKey = strtoupper($this->jiraApiService->getIssueKeyFromTask($task));
            if (1 === preg_match('/^[A-Z][A-Z0-9_]*-\d+$/', $issueKey)) {
                $knownKeys[$issueKey] = true;
            }
        }

        $missing = [];
        foreach ($this->jiraApiService->searchIssues($request) as $candidate) {
            $normalizedKey = strtoupper(trim($candidate['key']));
            if ('' === $normalizedKey || isset($knownKeys[$normalizedKey])) {
                continue;
            }

            $knownKeys[$normalizedKey] = true;
            $missing[] = $candidate;

            if (\count($missing) > $request->getLimit()) {
                return [
                    'data' => \array_slice($missing, 0, $request->getLimit()),
                    'truncated' => true,
                ];
            }
        }

        return [
            'data' => $missing,
            'truncated' => false,
        ];
    }

    /**
     * @throws JiraApiServiceException
     */
    private function sync(Task $task, string $date): void
    {
        $dateRange = $this->taskFilterDateRangeResolver->resolve(date: $date);
        if (null === $dateRange) {
            throw new \InvalidArgumentException('Sync date could not be resolved.');
        }

        $userTimezone = new \DateTimeZone($this->userTimezoneResolver->resolveCurrentUserTimezone());
        $canonicalDate = $dateRange['startDate']->setTimezone($userTimezone)->format('Y-m-d');
        $syncDate = (new \DateTime($canonicalDate))->setTime(0, 0, 0);
        $jiraStartDateTime = (new \DateTime($canonicalDate, $userTimezone))->setTime(17, 0, 0);

        $jiraWorkLog = $this->jiraWorkLogRepository->findOneBy(
            [
                'task' => $task,
                'startTime' => $syncDate,
            ]
        );

        if (!$jiraWorkLog instanceof JiraWorkLog) {
            $jiraWorkLog = new JiraWorkLog();
            $jiraWorkLog->setTask($task);
        }

        [$timeSpentSeconds, $descriptions] = $this->summarize(
            timeLogs: $task->getTimeLogs(),
            startDate: $dateRange['startDate'],
            endDate: $dateRange['endDate'],
        );
        $workLogId = $jiraWorkLog->getWorkLogId();

        if (str_contains($taskName = $task->getName(), '-#-')) {
            $descriptions = [trim(explode('-#-', $taskName)[1])];
        }

        $jiraApiWorkLog = $this->jiraApiService->syncWorkLog(
            task: $task,
            workLogId: $jiraWorkLog->getWorkLogId() ? (int) $jiraWorkLog->getWorkLogId() : null,
            startTime: $jiraStartDateTime,
            timeSpentSeconds: $timeSpentSeconds,
            description: implode(', ', $descriptions),
        );

        $jiraWorkLog->setTimeSpentSeconds($timeSpentSeconds);
        $jiraWorkLog->setStartTime($syncDate);
        $jiraWorkLog->setWorkLogId((string) $jiraApiWorkLog->id);

        $this->createUpdateJiraWorkLog(
            jiraWorkLog: $jiraWorkLog,
            workLogId: $workLogId
        );
    }

    /**
     * @param Collection<int, TimeLog> $timeLogs
     *
     * @return array{int, string[]}
     */
    private function summarize(
        Collection $timeLogs,
        \DateTimeInterface $startDate,
        \DateTimeInterface $endDate,
    ): array {
        $timeSpentSeconds = 0;
        $descriptions = [];

        /** @var TimeLog $timeLog */
        foreach ($timeLogs->toArray() as $timeLog) {
            $logStart = $timeLog->getStartTime();
            $logEnd = $timeLog->getEndTime();

            if (!TimeLogRange::overlaps($startDate, $endDate, $logStart, $logEnd)) {
                continue;
            }

            $timeSpentSeconds += TimeLogDuration::clippedSecondsInRange(
                rangeStart: $startDate,
                rangeEnd: $endDate,
                logStart: $logStart,
                logEnd: $logEnd,
            );

            if (!empty($description = $timeLog->getDescription())) {
                $descriptions[] = $description;
            }
        }

        return [$timeSpentSeconds, $descriptions];
    }

    private function createUpdateJiraWorkLog(
        JiraWorkLog $jiraWorkLog,
        ?string $workLogId,
    ): void {
        if (!$workLogId) {
            $this->jiraWorkLogRepository->save(
                entity: $jiraWorkLog,
                flush: true,
            );
        } else {
            $this->jiraWorkLogRepository->flush();
        }
    }
}
