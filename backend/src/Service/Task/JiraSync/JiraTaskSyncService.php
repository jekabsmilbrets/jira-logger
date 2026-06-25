<?php

declare(strict_types=1);

namespace App\Service\Task\JiraSync;

use App\Entity\JiraWorkLog\JiraWorkLog;
use App\Entity\Task\Task;
use App\Exception\JiraApiServiceException;
use App\Repository\JiraWorkLog\JiraWorkLogRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\JiraApi\JiraApiService;
use JiraRestApi\Issue\Worklog;

class JiraTaskSyncService implements TaskJiraSyncAdapter
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
    final public function syncTask(Task $task, string $date): bool
    {
        try {
            $this->jiraApiService->init();

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
        $syncDates = $this->taskFilterDateRangeResolver->resolveJiraSyncDate($date);
        $syncDate = $syncDates['syncDate'];
        $startDate = $syncDates['startDate'];
        $endDate = $syncDates['endDate'];
        $jiraStartDateTime = $syncDates['jiraStartDateTime'];

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
            startDate: $startDate,
            endDate: $endDate
        );
        $workLogId = $jiraWorkLog->getWorkLogId();

        if (str_contains($taskName = $task->getName(), '-#-')) {
            $descriptions = [trim(explode('-#-', $taskName)[1])];
        }

        $jiraApiWorkLog = $this->createUpdateRecreateWorkLogWithTimeSpent(
            jiraWorkLog: $jiraWorkLog,
            task: $task,
            startDate: $jiraStartDateTime,
            timeSpentSeconds: $timeSpentSeconds,
            descriptions: $descriptions,
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

    /**
     * @param string[] $descriptions
     *
     * @throws JiraApiServiceException
     */
    private function createUpdateRecreateWorkLogWithTimeSpent(
        JiraWorkLog $jiraWorkLog,
        Task $task,
        \DateTime $startDate,
        int $timeSpentSeconds,
        array $descriptions,
    ): Worklog {
        $descriptionsConcatenated = implode(', ', $descriptions);

        if (!empty($workLogId = $jiraWorkLog->getWorkLogId())) {
            try {
                $workLog = $this->jiraApiService->updateWorkLogWithTimeSpent(
                    task: $task,
                    workLogId: (int) $workLogId,
                    startTime: $startDate,
                    timeSpentSeconds: $timeSpentSeconds,
                    description: $descriptionsConcatenated,
                );
            } catch (JiraApiServiceException) {
                $workLog = $this->jiraApiService->createWorkLogWithTimeSpent(
                    task: $task,
                    startTime: $startDate,
                    timeSpentSeconds: $timeSpentSeconds,
                    description: $descriptionsConcatenated,
                );

                $jiraWorkLog->setWorkLogId((string) $workLog->id);
            }
        } else {
            $workLog = $this->jiraApiService->createWorkLogWithTimeSpent(
                task: $task,
                startTime: $startDate,
                timeSpentSeconds: $timeSpentSeconds,
                description: $descriptionsConcatenated,
            );
        }

        return $workLog;
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
