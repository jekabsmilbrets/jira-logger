<?php

declare(strict_types=1);

namespace App\Service\JiraApi;

use App\Entity\JiraWorkLog\JiraWorkLog;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Exception\JiraApiServiceException;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\JiraWorkLog\JiraWorkLogService;
use App\Service\Setting\SettingService;
use App\Utility\TimeLog\TimeLogDuration;
use App\Utility\TimeLog\TimeLogRange;
use Doctrine\Common\Collections\Collection;
use JiraRestApi\Configuration\ArrayConfiguration;
use JiraRestApi\Issue\IssueService;
use JiraRestApi\Issue\Worklog;
use JiraRestApi\JiraException;
use Psr\Log\LoggerInterface;

class JiraApiService
{
    final public const CREATE_ERROR_MSG = 'Failed to add workLog "%s - %s Seconds" to issue "%s": %s';
    final public const UPDATE_ERROR_MSG = 'Failed to update workLog "%s [%s]" to issue "%s": %s';
    final public const DELETE_ERROR_MSG = 'Failed to delete workLog "%s" from issue "%s": %s';
    final public const INIT_ERROR_MSG = 'Failed to initialize IssueService: %s';
    final public const MIN_SECOND_REPORT_ERROR_MSG = 'Cannot report less than %s second!';
    final public const MISSING_HOST_TOKEN_ERROR_MSG = 'No host or personal access token found!';
    final public const JIRA_DISABLED_MSG = 'JIRA sync not enabled!';

    final public const JIRA_ENABLED_KEY = 'jira.enabled';
    final public const JIRA_HOST_SETTING_KEY = 'jira.host';
    final public const JIRA_PERSONAL_ACCESS_TOKEN_SETTING_KEY = 'jira.personal-access-token';

    final public const MIN_REPORT_SECONDS = 60;

    private readonly IssueService $client;

    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly SettingService $settingService,
        private readonly JiraWorkLogService $jiraWorkLogService,
        private readonly TaskFilterDateRangeResolver $taskFilterDateRangeResolver,
    ) {
    }

    /**
     * @throws JiraApiServiceException
     */
    final public function init(): void
    {
        $this->client = $this->initClient();
    }

    /**
     * @throws JiraApiServiceException
     */
    final public function createWorkLogWithTimeLog(
        Task $task,
        TimeLog $timeLog,
    ): Worklog {
        try {
            $issueKey = $task->getName();
            $timeSpentSeconds = $this->calculateTimeSpentInSecondsSingleTimeLog($timeLog);

            $workLog = new Worklog();

            $workLog->setComment($timeLog->getDescription())
                ->setStartedDateTime($timeLog->getStartTime())
                ->setTimeSpentSeconds($timeSpentSeconds);

            return $this->client->addWorklog(
                issueIdOrKey: $issueKey,
                worklog: $workLog,
            );
        } catch (JiraException|\JsonMapper_Exception|JiraApiServiceException $e) {
            $this->logger->error(
                message: sprintf(
                    self::CREATE_ERROR_MSG,
                    $timeLog->getDescription(),
                    (string) ($timeSpentSeconds ?? '?'),
                    $issueKey,
                    $e->getMessage(),
                )
            );

            throw new JiraApiServiceException(message: $e->getMessage(), code: $e->getCode(), previous: $e);
        }
    }

    /**
     * @throws JiraApiServiceException
     */
    final public function createWorkLogWithTimeSpent(
        Task $task,
        \DateTime $startTime,
        int $timeSpentSeconds,
        ?string $description = null,
    ): Worklog {
        try {
            $issueKey = $this->getIssueNameFromTask($task);

            $description = $description ?? $task->getDescription();

            $workLog = $this->prepareWorkLog(
                task: $task,
                startTime: $startTime,
                timeSpentSeconds: $timeSpentSeconds,
                description: $description,
            );

            return $this->client->addWorklog(
                issueIdOrKey: $issueKey,
                worklog: $workLog,
            );
        } catch (JiraException|\JsonMapper_Exception|JiraApiServiceException $e) {
            $this->logger->error(
                message: sprintf(
                    self::CREATE_ERROR_MSG,
                    $description,
                    (string) ($timeSpentSeconds ?? '?'),
                    $issueKey,
                    $e->getMessage(),
                )
            );

            throw new JiraApiServiceException(message: $e->getMessage(), code: $e->getCode(), previous: $e);
        }
    }

    /**
     * @throws JiraApiServiceException
     */
    final public function updateWorkLogWithTimeLog(
        Task $task,
        int $workLogId,
        TimeLog $timeLog,
    ): Worklog {
        try {
            $issueKey = $task->getName();
            $timeSpentSeconds = $this->calculateTimeSpentInSecondsSingleTimeLog($timeLog);

            $workLog = new Worklog();

            $workLog->setComment($timeLog->getDescription())
                ->setStartedDateTime($timeLog->getStartTime())
                ->setTimeSpentSeconds($timeSpentSeconds);

            return $this->client->editWorklog(
                issueIdOrKey: $issueKey,
                worklog: $workLog,
                worklogId: $workLogId,
            );
        } catch (JiraException|\JsonMapper_Exception|JiraApiServiceException $e) {
            $this->logger->error(
                message: sprintf(
                    self::UPDATE_ERROR_MSG,
                    $timeLog->getDescription(),
                    $workLogId,
                    $issueKey,
                    $e->getMessage(),
                )
            );

            throw new JiraApiServiceException(message: $e->getMessage(), code: $e->getCode(), previous: $e);
        }
    }

    /**
     * @throws JiraApiServiceException
     */
    final public function updateWorkLogWithTimeSpent(
        Task $task,
        int $workLogId,
        \DateTime $startTime,
        int $timeSpentSeconds,
        ?string $description = null,
    ): Worklog {
        try {
            $issueKey = $this->getIssueNameFromTask($task);

            $description = $description ?? $task->getDescription();

            $workLog = $this->prepareWorkLog(
                task: $task,
                startTime: $startTime,
                timeSpentSeconds: $timeSpentSeconds,
                description: $description,
            );

            return $this->client->editWorklog(
                issueIdOrKey: $issueKey,
                worklog: $workLog,
                worklogId: $workLogId,
            );
        } catch (JiraException|\JsonMapper_Exception|JiraApiServiceException $e) {
            $this->logger->error(
                message: sprintf(
                    self::UPDATE_ERROR_MSG,
                    $description,
                    $workLogId,
                    $issueKey,
                    $e->getMessage(),
                )
            );

            throw new JiraApiServiceException(message: $e->getMessage(), code: $e->getCode(), previous: $e);
        }
    }

    /**
     * @throws JiraApiServiceException
     */
    final public function sync(
        Task $task,
        string $date,
    ): bool {
        [$syncDate, $startDate, $endDate, $jiraStartDateTime] = $this->resolveSyncDates($date);

        $jiraWorkLog = $this->jiraWorkLogService->findOneBy(
            [
                'task' => $task,
                'startTime' => $syncDate,
            ]
        );

        if (!$jiraWorkLog instanceof JiraWorkLog) {
            $jiraWorkLog = new JiraWorkLog();
            $jiraWorkLog->setTask($task);
        }

        $timeLogs = $task->getTimeLogs();

        [$timeSpentSeconds, $descriptions] = $this->calculateTimeSpentInSecondsCollectDescriptionsInTimeLogsCollection(
            timeLogs: $timeLogs,
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

    private function resolveSyncDates(string $date): array
    {
        $dateRange = $this->taskFilterDateRangeResolver->resolve(['date' => $date]);
        if (null === $dateRange) {
            throw new \InvalidArgumentException('Sync date could not be resolved.');
        }

        $syncDate = (new \DateTime($date))->setTime(0, 0, 0);
        $startDate = $dateRange['startDate'];
        $endDate = $dateRange['endDate'];
        $jiraStartDateTime = (clone $syncDate)->setTime(17, 0, 0);

        return [$syncDate, $startDate, $endDate, $jiraStartDateTime];
    }

    /**
     * @throws JiraApiServiceException
     */
    final public function deleteWorkLog(
        Task $task,
        int $workLogId,
    ): bool {
        try {
            $issueKey = $task->getName();

            return $this->client->deleteWorklog(
                issueIdOrKey: $issueKey,
                worklogId: $workLogId,
            );
        } catch (JiraException $e) {
            $this->logger->error(
                sprintf(
                    self::DELETE_ERROR_MSG,
                    $workLogId,
                    $issueKey,
                    $e->getMessage(),
                )
            );

            throw new JiraApiServiceException(message: $e->getMessage(), code: $e->getCode(), previous: $e);
        }
    }

    /**
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
                $workLog = $this->updateWorkLogWithTimeSpent(
                    task: $task,
                    workLogId: (int) ($workLogId ?? 0),
                    startTime: $startDate,
                    timeSpentSeconds: $timeSpentSeconds,
                    description: $descriptionsConcatenated,
                );
            } catch (JiraApiServiceException $e) {
                $workLog = $this->createWorkLogWithTimeSpent(
                    task: $task,
                    startTime: $startDate,
                    timeSpentSeconds: $timeSpentSeconds,
                    description: $descriptionsConcatenated,
                );

                $jiraWorkLog->setWorkLogId((string) $workLog->id);
            }
        } else {
            $workLog = $this->createWorkLogWithTimeSpent(
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
            $this->jiraWorkLogService->new(
                jiraWorkLog: $jiraWorkLog,
            );
        } else {
            $this->jiraWorkLogService->edit(
                id: $jiraWorkLog->getId(),
                jiraWorkLog: $jiraWorkLog,
            );
        }
    }

    /**
     * @throws JiraApiServiceException
     */
    private function prepareWorkLog(
        Task $task,
        \DateTime $startTime,
        int $timeSpentSeconds,
        ?string $description = null,
    ): Worklog {
        if ($timeSpentSeconds < self::MIN_REPORT_SECONDS) {
            throw new JiraApiServiceException(message: sprintf(self::MIN_SECOND_REPORT_ERROR_MSG, self::MIN_REPORT_SECONDS));
        }

        $workLog = new Worklog();

        $workLog->setComment($description ?? $task->getDescription())
            ->setStartedDateTime($startTime)
            ->setTimeSpentSeconds($timeSpentSeconds);

        return $workLog;
    }

    /**
     * @throws JiraApiServiceException
     */
    private function calculateTimeSpentInSecondsSingleTimeLog(
        TimeLog $timeLog,
    ): int {
        $startTime = $timeLog->getStartTime();
        $endTime = $timeLog->getEndTime();

        $timeSpentSeconds = TimeLogDuration::secondsBetween($startTime, $endTime);

        if ($timeSpentSeconds < self::MIN_REPORT_SECONDS) {
            throw new JiraApiServiceException(message: sprintf(self::MIN_SECOND_REPORT_ERROR_MSG, self::MIN_REPORT_SECONDS));
        }

        return $timeSpentSeconds;
    }

    private function calculateTimeSpentInSecondsCollectDescriptionsInTimeLogsCollection(
        Collection $timeLogs,
        \DateTimeInterface $startDate,
        \DateTimeInterface $endDate,
    ): array {
        return $this->collectTimeSpentSecondsNDescriptions(
            $this->filterTimeLogsInDateRange(
                $timeLogs,
                $startDate,
                $endDate
            ),
            $startDate,
            $endDate
        );
    }

    private function filterTimeLogsInDateRange(
        Collection $timeLogs,
        \DateTimeInterface $startDate,
        \DateTimeInterface $endDate,
    ): Collection {
        return $timeLogs->filter(
            function (TimeLog $timeLog) use ($startDate, $endDate) {
                $startTime = $timeLog->getStartTime();
                $endTime = $timeLog->getEndTime();

                return TimeLogRange::overlaps($startDate, $endDate, $startTime, $endTime);
            }
        );
    }

    private function collectTimeSpentSecondsNDescriptions(
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

            if ($startTime) {
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
        }

        return [
            $timeSpentSeconds,
            $descriptions,
        ];
    }

    /**
     * @throws JiraApiServiceException
     */
    private function initClient(): IssueService
    {
        try {
            $jiraSyncEnabled = filter_var(
                value: $this->settingService->findByName(
                    self::JIRA_ENABLED_KEY
                )?->getValue(),
                filter: \FILTER_VALIDATE_BOOLEAN
            );

            if (!$jiraSyncEnabled) {
                throw new JiraApiServiceException(self::JIRA_DISABLED_MSG);
            }

            $jiraHost = $this->settingService->findByName(
                self::JIRA_HOST_SETTING_KEY
            )?->getValue();
            $personalAccessToken = getenv('JIRA_PERSONAL_ACCESS_TOKEN') ?:
                $this->settingService->findByName(
                    self::JIRA_PERSONAL_ACCESS_TOKEN_SETTING_KEY
                )?->getValue() ?:
                null;

            if (
                !$jiraHost ||
                !$personalAccessToken
            ) {
                throw new JiraApiServiceException(self::MISSING_HOST_TOKEN_ERROR_MSG);
            }

            return new IssueService(
                configuration: new ArrayConfiguration(
                    [
                        'jiraHost' => $jiraHost,

                        'useTokenBasedAuth' => true,
                        'personalAccessToken' => $personalAccessToken,
                    ],
                ),
                logger: $this->logger,
            );
        } catch (JiraException|JiraApiServiceException $e) {
            $this->logger->error(
                message: sprintf(
                    self::INIT_ERROR_MSG,
                    $e->getMessage(),
                )
            );

            throw new JiraApiServiceException(message: $e->getMessage(), code: $e->getCode(), previous: $e);
        }
    }

    private function getIssueNameFromTask(Task $task): string
    {
        return trim(explode('-#-', $task->getName())[0]);
    }
}
