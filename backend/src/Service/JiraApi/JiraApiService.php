<?php

declare(strict_types=1);

namespace App\Service\JiraApi;

use App\Dto\Task\JiraTaskSearchRequest;
use App\Entity\Task\Task;
use App\Exception\JiraApiServiceException;
use App\Service\Setting\SettingService;
use JiraRestApi\Configuration\ArrayConfiguration;
use JiraRestApi\Issue\Issue;
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
    final public const SEARCH_ERROR_MSG = 'Jira issue search failed.';

    final public const JIRA_ENABLED_KEY = 'jira.enabled';
    final public const JIRA_HOST_SETTING_KEY = 'jira.host';
    final public const JIRA_PERSONAL_ACCESS_TOKEN_SETTING_KEY = 'jira.personal-access-token';

    final public const MIN_REPORT_SECONDS = 60;
    private const SEARCH_FIELDS = ['summary', 'status', 'issuetype', 'updated'];
    private const LEGACY_UNSUPPORTED_STATUSES = [404, 405, 410];

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
        $issueKey = $this->getIssueKeyFromTask($task);
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
     * @return iterable<array{key: string, summary: string, status: string, issueType: string, updated: ?string}>
     *
     * @throws JiraApiServiceException
     */
    public function searchIssues(JiraTaskSearchRequest $request): iterable
    {
        $client = $this->initClient();
        $jql = $this->buildSearchJql($request);
        $limit = $request->getLimit();

        try {
            $this->logger->info('Jira issue search started.', ['mode' => 'legacy']);
            yield from $this->searchLegacy($client, $jql, $limit);
        } catch (JiraException $e) {
            if (!\in_array($e->getCode(), self::LEGACY_UNSUPPORTED_STATUSES, true)) {
                throw $this->searchException($e, 'legacy');
            }

            try {
                $this->logger->info('Jira issue search started.', ['mode' => 'enhanced']);
                yield from $this->searchEnhanced($client, $jql, $limit);
            } catch (JiraException|\JsonMapper_Exception $fallbackError) {
                throw $this->searchException($fallbackError, 'enhanced');
            }
        } catch (\JsonException $e) {
            throw $this->searchException($e, 'legacy');
        }
    }

    public function getIssueKeyFromTask(Task $task): string
    {
        return trim(explode('-#-', $task->getName(), 2)[0]);
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
    protected function initClient(): IssueService
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
                self::JIRA_PERSONAL_ACCESS_TOKEN_SETTING_KEY
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

    private function buildSearchJql(JiraTaskSearchRequest $request): string
    {
        $clauses = [];
        $userClauses = [];

        if ($request->isAssignedToMe()) {
            $userClauses[] = 'assignee = currentUser()';
        }

        if ($request->isReportedByMe()) {
            $userClauses[] = 'reporter = currentUser()';
        }

        if ([] !== $userClauses) {
            $clauses[] = \count($userClauses) > 1
                ? '('.implode(' OR ', $userClauses).')'
                : $userClauses[0];
        }

        if ('unresolved' === $request->getResolution()) {
            $clauses[] = 'resolution IS EMPTY';
        } elseif ('resolved' === $request->getResolution()) {
            $clauses[] = 'resolution IS NOT EMPTY';
        }

        $projectKeys = $request->getProjectKeys();
        if ([] !== $projectKeys) {
            $clauses[] = 'project IN ('.implode(', ', array_map(
                static fn (string $key): string => '"'.$key.'"',
                $projectKeys,
            )).')';
        }

        return implode(' AND ', $clauses).' ORDER BY updated DESC';
    }

    /**
     * @return \Generator<int, array{key: string, summary: string, status: string, issueType: string, updated: ?string}>
     *
     * @throws JiraException
     * @throws \JsonException
     */
    private function searchLegacy(IssueService $client, string $jql, int $limit): \Generator
    {
        $startAt = 0;

        do {
            $response = $client->exec(
                '/search',
                json_encode([
                    'jql' => $jql,
                    'startAt' => $startAt,
                    'maxResults' => $limit,
                    'fields' => self::SEARCH_FIELDS,
                ], \JSON_THROW_ON_ERROR),
                'POST',
            );

            if (!\is_string($response)) {
                throw new \JsonException('Jira returned an empty search response.');
            }

            $decoded = json_decode($response, true, flags: \JSON_THROW_ON_ERROR);
            if (!\is_array($decoded)) {
                throw new \JsonException('Jira returned an invalid search response.');
            }

            $issues = \is_array($decoded['issues'] ?? null) ? $decoded['issues'] : [];
            foreach ($issues as $issue) {
                if (\is_array($issue)) {
                    yield $this->mapLegacyIssue($issue);
                }
            }

            $count = \count($issues);
            $startAt += $count;
            $total = \is_int($decoded['total'] ?? null) ? $decoded['total'] : $startAt;
        } while ($count > 0 && $startAt < $total);
    }

    /**
     * @return \Generator<int, array{key: string, summary: string, status: string, issueType: string, updated: ?string}>
     *
     * @throws JiraException
     * @throws \JsonMapper_Exception
     */
    private function searchEnhanced(IssueService $client, string $jql, int $limit): \Generator
    {
        $nextPageToken = '';

        do {
            $result = $client->search(
                jql: $jql,
                nextPageToken: $nextPageToken,
                maxResults: $limit,
                fields: self::SEARCH_FIELDS,
            );

            foreach ($result->getIssues() as $issue) {
                yield $this->mapEnhancedIssue($issue);
            }

            $nextPageToken = $result->getNextPageToken() ?? '';
        } while ('' !== $nextPageToken);
    }

    /**
     * @param array<string, mixed> $issue
     *
     * @return array{key: string, summary: string, status: string, issueType: string, updated: ?string}
     */
    private function mapLegacyIssue(array $issue): array
    {
        $fields = \is_array($issue['fields'] ?? null) ? $issue['fields'] : [];
        $status = \is_array($fields['status'] ?? null) ? $fields['status'] : [];
        $issueType = \is_array($fields['issuetype'] ?? null) ? $fields['issuetype'] : [];

        return [
            'key' => (string) ($issue['key'] ?? ''),
            'summary' => (string) ($fields['summary'] ?? ''),
            'status' => (string) ($status['name'] ?? ''),
            'issueType' => (string) ($issueType['name'] ?? ''),
            'updated' => $this->formatUpdated(\is_string($fields['updated'] ?? null) ? $fields['updated'] : null),
        ];
    }

    /**
     * @return array{key: string, summary: string, status: string, issueType: string, updated: ?string}
     */
    private function mapEnhancedIssue(Issue $issue): array
    {
        return [
            'key' => $issue->key,
            'summary' => $issue->fields->summary,
            'status' => isset($issue->fields->status) ? (string) $issue->fields->status->name : '',
            'issueType' => isset($issue->fields->issuetype) ? (string) $issue->fields->issuetype->name : '',
            'updated' => $this->formatUpdated($issue->fields->updated),
        ];
    }

    private function formatUpdated(\DateTimeInterface|string|null $updated): ?string
    {
        if ($updated instanceof \DateTimeInterface) {
            return $updated->format(\DATE_ATOM);
        }

        if (null === $updated || '' === trim($updated)) {
            return null;
        }

        try {
            return (new \DateTimeImmutable($updated))->format(\DATE_ATOM);
        } catch (\Exception) {
            return null;
        }
    }

    private function searchException(\Throwable $error, string $mode): JiraApiServiceException
    {
        $this->logger->error('Jira issue search failed.', [
            'mode' => $mode,
            'status' => $error->getCode(),
            'exception' => $error::class,
        ]);

        return new JiraApiServiceException(
            message: self::SEARCH_ERROR_MSG,
            code: $error->getCode(),
            previous: $error,
        );
    }
}
