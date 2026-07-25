<?php

declare(strict_types=1);

namespace App\Service\JiraApi;

use App\Entity\Task\Task;
use App\Exception\JiraApiServiceException;
use App\Service\Setting\SettingService;
use JiraRestApi\Configuration\ArrayConfiguration;
use JiraRestApi\Issue\IssueService;
use JiraRestApi\Issue\Worklog;
use JiraRestApi\JiraException;
use Psr\Log\LoggerInterface;

class JiraApiService
{
    final public const CREATE_ERROR_MSG = 'Failed to add workLog "%s - %s Seconds" to issue "%s": %s';
    final public const UPDATE_ERROR_MSG = 'Failed to update workLog "%s [%s]" to issue "%s": %s';
    final public const INIT_ERROR_MSG = 'Failed to initialize IssueService: %s';
    final public const MIN_SECOND_REPORT_ERROR_MSG = 'Cannot report less than %s second!';
    final public const MISSING_HOST_TOKEN_ERROR_MSG = 'No host or personal access token found!';
    final public const JIRA_DISABLED_MSG = 'JIRA sync not enabled!';

    final public const JIRA_ENABLED_KEY = 'jira.enabled';
    final public const JIRA_HOST_SETTING_KEY = 'jira.host';
    final public const JIRA_PAT_SETTING_KEY = 'jira.personal-access-token';

    final public const MIN_REPORT_SECONDS = 60;

    private IssueService $client;

    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly SettingService $settingService,
    ) {
    }

    /**
     * @throws JiraApiServiceException
     */
    public function syncWorkLog(
        Task $task,
        ?int $workLogId,
        \DateTime $startTime,
        int $timeSpentSeconds,
        ?string $description = null,
    ): Worklog {
        $this->client = $this->initClient();
        $issueKey = $this->getIssueNameFromTask($task);
        $description = $description ?? $task->getDescription();
        $workLog = $this->prepareWorkLog(
            task: $task,
            startTime: $startTime,
            timeSpentSeconds: $timeSpentSeconds,
            description: $description,
        );
        if (null !== $workLogId) {
            try {
                return $this->updateWorkLog($issueKey, $workLog, $workLogId, $description);
            } catch (JiraApiServiceException) {
            }
        }

        return $this->createWorkLog($issueKey, $workLog, $description, $timeSpentSeconds);
    }

    /**
     * @throws JiraApiServiceException
     */
    private function createWorkLog(
        string $issueKey,
        Worklog $workLog,
        ?string $description,
        int $timeSpentSeconds,
    ): Worklog {
        try {
            return $this->client->addWorklog(
                issueIdOrKey: $issueKey,
                worklog: $workLog,
            );
        } catch (JiraException|\JsonMapper_Exception $e) {
            $this->logger->error(
                message: sprintf(
                    self::CREATE_ERROR_MSG,
                    $description,
                    (string) $timeSpentSeconds,
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
    private function updateWorkLog(
        string $issueKey,
        Worklog $workLog,
        int $workLogId,
        ?string $description = null,
    ): Worklog {
        try {
            return $this->client->editWorklog(
                issueIdOrKey: $issueKey,
                worklog: $workLog,
                worklogId: $workLogId,
            );
        } catch (JiraException|\JsonMapper_Exception $e) {
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
    private function initClient(): IssueService
    {
        try {
            $jiraSyncEnabled = $this->settingService->booleanValue(self::JIRA_ENABLED_KEY);

            if (!$jiraSyncEnabled) {
                throw new JiraApiServiceException(self::JIRA_DISABLED_MSG);
            }

            $jiraHost = $this->settingService->findValue(
                self::JIRA_HOST_SETTING_KEY
            );
            $personalAccessToken = $this->settingService->findValue(
                self::JIRA_PAT_SETTING_KEY
            );

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
