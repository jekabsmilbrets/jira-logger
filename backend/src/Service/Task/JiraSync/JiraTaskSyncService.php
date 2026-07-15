<?php

declare(strict_types=1);

namespace App\Service\Task\JiraSync;

use App\Entity\JiraWorkLog\JiraWorkLog;
use App\Entity\Task\Task;
use App\Exception\JiraApiServiceException;
use App\Repository\JiraWorkLog\JiraWorkLogRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\JiraApi\JiraApiService;

class JiraTaskSyncService
{
    public function __construct(
        private readonly JiraApiService $jiraApiService,
        private readonly JiraWorkLogRepository $jiraWorkLogRepository,
        private readonly TaskFilterDateRangeResolver $taskFilterDateRangeResolver,
        private readonly JiraSyncTimeLogAggregation $timeLogAggregation,
    ) {
    }

    /**
     * @throws TaskJiraSyncException
     */
    public function syncTask(Task $task, string $date): bool
    {
        try {
            return $this->sync($task, $date);
        } catch (JiraApiServiceException $e) {
            throw new TaskJiraSyncException(message: $e->getMessage(), code: $e->getCode(), previous: $e);
        }
    }

    /**
     * @throws JiraApiServiceException
     */
    final public function sync(Task $task, string $date): bool
    {
        $period = $this->taskFilterDateRangeResolver->resolveJiraSyncDate($date);
        $syncDate = $period->syncDate();

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

        [$timeSpentSeconds, $descriptions] = $this->timeLogAggregation->summarize(
            timeLogs: $task->getTimeLogs(),
            startDate: $period->startDate(),
            endDate: $period->endDate(),
        );
        $workLogId = $jiraWorkLog->getWorkLogId();

        if (str_contains($taskName = $task->getName(), '-#-')) {
            $descriptions = [trim(explode('-#-', $taskName)[1])];
        }

        $jiraApiWorkLog = $this->jiraApiService->syncWorkLog(
            task: $task,
            workLogId: $jiraWorkLog->getWorkLogId() ? (int) $jiraWorkLog->getWorkLogId() : null,
            startTime: $period->jiraStartDateTime(),
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

        return true;
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
