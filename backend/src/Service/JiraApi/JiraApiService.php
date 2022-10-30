<?php

declare(strict_types=1);

namespace App\Service\JiraApi;

use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Exception\JiraApiServiceException;
use App\Service\Setting\SettingService;
use JiraRestApi\Configuration\ArrayConfiguration;
use JiraRestApi\Issue\IssueService;
use JiraRestApi\Issue\Worklog;
use JiraRestApi\JiraException;
use JsonMapper_Exception;
use Psr\Log\LoggerInterface;

class JiraApiService
{
    final public const CREATE_ERROR_MSG = 'Failed to add workLog "%s - %s Seconds" to issue "%s": %s';
    final public const UPDATE_ERROR_MSG = 'Failed to update workLog "%s [%s]" to issue "%s": %s';
    final public const DELETE_ERROR_MSG = 'Failed to delete workLog "%s" from issue "%s": %s';
    final public const INIT_ERROR_MSG = 'Failed to initialize IssueService: %s';
    final public const MIN_SECOND_REPORT_ERROR_MSG = 'Cannot report less than %s second!';
    final public const MISSING_HOST_TOKEN_ERROR_MSG = 'No host or personal access token found!';

    final public const JIRA_HOST_SETTING_KEY = 'jira.host';
    final public const JIRA_PERSONAL_ACCESS_TOKEN_SETTING_KEY = 'jira.personal-access-token';

    final public const MIN_REPORT_SECONDS = 60;

    private readonly IssueService $client;

    /**
     * @throws JiraApiServiceException
     */
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly SettingService  $settingService,
    ) {
        $this->client = $this->initClient();
    }

    /**
     * @throws JiraApiServiceException
     */
    final public function createWorkLog(
        Task    $task,
        TimeLog $timeLog,
    ): Worklog {
        try {
            $issueKey = $task->getName();
            $timeSpentSeconds = $this->calculateTimeSpentInSeconds($timeLog);

            $workLog = new Worklog();

            $workLog->setComment($timeLog->getDescription())
                ->setStartedDateTime($timeLog->getStartTime())
                ->setTimeSpentSeconds($timeSpentSeconds);

            return $this->client->addWorklog(
                issueIdOrKey: $issueKey,
                worklog: $workLog,
            );
        } catch (JiraException|JsonMapper_Exception|JiraApiServiceException $e) {
            $this->logger->error(
                message: sprintf(
                    self::CREATE_ERROR_MSG,
                    $timeLog->getDescription(),
                    (string)($timeSpentSeconds ?? '?'),
                    $issueKey,
                    $e->getMessage(),
                )
            );

            throw new JiraApiServiceException(
                message: $e->getMessage(),
                code: $e->getCode(),
                previous: $e,
            );
        }
    }

    /**
     * @throws JiraApiServiceException
     */
    final public function updateWorkLog(
        Task    $task,
        TimeLog $timeLog,
        int  $workLogId,
    ): Worklog {
        try {
            $issueKey = $task->getName();
            $timeSpentSeconds = $this->calculateTimeSpentInSeconds($timeLog);

            $workLog = new Worklog();

            $workLog->setComment($timeLog->getDescription())
                ->setStartedDateTime($timeLog->getStartTime())
                ->setTimeSpentSeconds($timeSpentSeconds);

            return $this->client->editWorklog(
                issueIdOrKey: $issueKey,
                worklog: $workLog,
                worklogId: $workLogId,
            );
        } catch (JiraException|JsonMapper_Exception|JiraApiServiceException $e) {
            $this->logger->error(
                message: sprintf(
                    self::UPDATE_ERROR_MSG,
                    $timeLog->getDescription(),
                    $workLogId,
                    $issueKey,
                    $e->getMessage(),
                )
            );

            throw new JiraApiServiceException(
                message: $e->getMessage(),
                code: $e->getCode(),
                previous: $e,
            );
        }
    }

    /**
     * @throws JiraApiServiceException
     */
    final public function deleteWorkLog(
        Task   $task,
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

            throw new JiraApiServiceException(
                message: $e->getMessage(),
                code: $e->getCode(),
                previous: $e,
            );
        }
    }

    /**
     * @throws JiraApiServiceException
     */
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
                throw new JiraApiServiceException(self::MISSING_HOST_TOKEN_ERROR_MSG);
            }

            return new IssueService(
                configuration: new ArrayConfiguration(
                    [
                        'jiraHost' => $jiraHost, // 'https://jira.demo.goedit.io',

                        'useTokenBasedAuth' => true,
                        'personalAccessToken' => $personalAccessToken, // 'NzQyOTk4MDI0MzUxOq351RNlfRqRPcotDdxIfgCUX7JC',
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

            throw new JiraApiServiceException(
                message: $e->getMessage(),
                code: $e->getCode(),
                previous: $e,
            );
        }
    }

    /**
     * @throws JiraApiServiceException
     */
    private function calculateTimeSpentInSeconds(
        TimeLog $timeLog,
    ): int {
        $startTime = $timeLog->getStartTime();
        $endTime = $timeLog->getEndTime();

        $timeSpentSeconds = ($endTime && $startTime) ? (
            $endTime->getTimestamp() - $startTime->getTimestamp()
        ) : 0;

        if ($timeSpentSeconds < self::MIN_REPORT_SECONDS) {
            throw new JiraApiServiceException(
                message: sprintf(
                    self::MIN_SECOND_REPORT_ERROR_MSG,
                    self::MIN_REPORT_SECONDS,
                )
            );
        }

        return $timeSpentSeconds;
    }
}
