<?php

namespace App\Service\JiraApi;

use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Service\Setting\SettingService;
use JiraRestApi\Configuration\ArrayConfiguration;
use JiraRestApi\Issue\IssueService;
use JiraRestApi\Issue\Worklog;
use JiraRestApi\JiraException;
use JsonMapper_Exception;
use Psr\Log\LoggerInterface;
use RuntimeException;

class JiraApiService
{
    final public const CREATE_ERROR_MSG = 'Failed to add workLog "%s - %s Seconds" to issue "%s": %s';
    final public const UPDATE_ERROR_MSG = 'Failed to update workLog "%s [%s]" to issue "%s": %s';
    final public const DELETE_ERROR_MSG = 'Failed to delete workLog "%s" from issue "%s": %s';
    final public const INIT_ERROR_MSG = 'Failed to initialize IssueService: %s';

    final public const JIRA_HOST_SETTING_KEY = 'jira.host';
    final public const JIRA_PERSONAL_ACCESS_TOKEN_SETTING_KEY = 'jira.personal-access-token';

    private readonly IssueService $client;

    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly SettingService  $settingService,
    ) {
        $this->client = $this->initClient();
    }

    private function initClient(): IssueService
    {
        try {
            $jiraHost = $this->settingService->findByName(
                self::JIRA_HOST_SETTING_KEY
            )?->getValue();
            $personalAccessToken = $this->settingService->findByName(
                self::JIRA_PERSONAL_ACCESS_TOKEN_SETTING_KEY
            )?->getValue();

            if (
                !$jiraHost ||
                !$personalAccessToken
            ) {
                throw new RuntimeException('No host or personal access token found!');
            }

            return new IssueService(
                configuration: new ArrayConfiguration(
                    [
                        'jiraHost' => $jiraHost, // 'https://jira.demo.goedit.io',

                        'useTokenBasedAuth' => true,
                        'personalAccessToken' => $personalAccessToken, // 'NzQyOTk4MDI0MzUxOq351RNlfRqRPcotDdxIfgCUX7JC',
                    ]
                ),
                logger: $this->logger
            );
        } catch (JiraException|RuntimeException $e) {
            $this->logger->error(
                sprintf(
                    self::INIT_ERROR_MSG,
                    $e->getMessage()
                )
            );
            throw new RuntimeException($e->getMessage(), $e->getCode(), $e);
        }
    }

    final public function createWorkLog(
        Task    $task,
        TimeLog $timeLog
    ): Worklog {
        $issueKey = $task->getName();
        $timeSpentSeconds = ($timeLog->getEndTime()?->getTimestamp() ?? 0) - ($timeLog->getStartTime()?->getTimestamp() ?? 0);

        $workLog = new Worklog();

        $workLog->setComment($timeLog->getDescription())
            ->setStartedDateTime($timeLog->getStartTime())
            ->setTimeSpentSeconds($timeSpentSeconds);

        try {
            return $this->client->addWorklog(
                issueIdOrKey: $issueKey,
                worklog: $workLog
            );
        } catch (JiraException|JsonMapper_Exception $e) {
            $this->logger->error(
                sprintf(
                    self::CREATE_ERROR_MSG,
                    $timeLog->getDescription(),
                    $timeSpentSeconds,
                    $issueKey,
                    $e->getMessage()
                )
            );

            throw new RuntimeException($e->getMessage(), $e->getCode(), $e);
        }
    }

    final public function updateWorkLog(
        Task    $task,
        TimeLog $timeLog,
        string  $workLogId
    ): Worklog {
        $issueKey = $task->getName();
        $timeSpentSeconds = $timeLog->getEndTime()?->getTimestamp() ?? 0 - $timeLog->getStartTime()?->getTimestamp() ?? 0;

        $workLog = new Worklog();

        $workLog->setComment($timeLog->getDescription())
            ->setStartedDateTime($timeLog->getStartTime())
            ->setTimeSpentSeconds($timeSpentSeconds);

        try {
            return $this->client->editWorklog(
                issueIdOrKey: $issueKey,
                worklog: $workLog,
                worklogId: $workLogId
            );
        } catch (JiraException|JsonMapper_Exception $e) {
            $this->logger->error(
                sprintf(
                    self::UPDATE_ERROR_MSG,
                    $timeLog->getDescription(),
                    $workLogId,
                    $issueKey,
                    $e->getMessage()
                )
            );
            throw new RuntimeException($e->getMessage(), $e->getCode(), $e);
        }
    }

    final public function deleteWorkLog(
        Task   $task,
        string $workLogId
    ): bool {
        $issueKey = $task->getName();

        try {
            return $this->client->deleteWorklog(
                issueIdOrKey: $issueKey,
                worklogId: $workLogId
            );
        } catch (JiraException $e) {
            $this->logger->error(
                sprintf(
                    self::DELETE_ERROR_MSG,
                    $workLogId,
                    $issueKey,
                    $e->getMessage()
                )
            );
            throw new RuntimeException($e->getMessage(), $e->getCode(), $e);
        }
    }
}
