<?php

declare(strict_types=1);

namespace App\Tests\Service\JiraApi;

use App\Dto\Task\JiraTaskSearchRequest;
use App\Entity\Setting\Setting;
use App\Entity\Task\Task;
use App\Exception\JiraApiServiceException;
use App\Repository\Setting\SettingRepository;
use App\Service\JiraApi\JiraApiService;
use App\Service\Setting\SettingService;
use JiraRestApi\Issue\Issue;
use JiraRestApi\Issue\IssueField;
use JiraRestApi\Issue\IssueSearchResult;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use JiraRestApi\Issue\IssueService;
use JiraRestApi\Issue\IssueStatus;
use JiraRestApi\Issue\IssueType;
use JiraRestApi\JiraException;

final class JiraApiServiceTest extends TestCase
{
    public function testSyncWorkLogRejectsValuesBelowMinimumThresholdAfterConfiguration(): void
    {
        $settingRepository = $this->createMock(SettingRepository::class);
        $settings = [
            JiraApiService::JIRA_ENABLED_KEY => (new Setting())->setName(JiraApiService::JIRA_ENABLED_KEY)->setValue('true'),
            JiraApiService::JIRA_HOST_SETTING_KEY => (new Setting())->setName(JiraApiService::JIRA_HOST_SETTING_KEY)->setValue('https://jira.example.test'),
            JiraApiService::JIRA_PERSONAL_ACCESS_TOKEN_SETTING_KEY => (new Setting())->setName(JiraApiService::JIRA_PERSONAL_ACCESS_TOKEN_SETTING_KEY)->setValue('token'),
        ];
        $settingRepository
            ->method('findOneBy')
            ->willReturnCallback(static fn (array $criteria): ?Setting => $settings[$criteria['name']] ?? null);

        $this->expectException(JiraApiServiceException::class);
        $this->expectExceptionMessage('Cannot report less than 60 second!');

        (new JiraApiService(
            $this->createMock(LoggerInterface::class),
            new SettingService($settingRepository),
        ))->syncWorkLog(
            task: (new Task())->setName('TASK-1'),
            workLogId: null,
            startTime: new \DateTime('2026-05-30 10:00:00'),
            timeSpentSeconds: 59,
        );
    }

    public function testLegacySearchBuildsControlledJqlAndPaginates(): void
    {
        $client = $this->issueServiceMock();
        $requests = [];
        $client
            ->expects(self::exactly(2))
            ->method('exec')
            ->willReturnCallback(static function (string $path, string $body, ?string $method) use (&$requests): string {
                self::assertSame('/search', $path);
                self::assertSame('POST', $method);
                $request = json_decode($body, true, flags: \JSON_THROW_ON_ERROR);
                $requests[] = $request;
                $index = \count($requests);

                return json_encode([
                    'total' => 2,
                    'issues' => [[
                        'key' => 'ABC-'.$index,
                        'fields' => [
                            'summary' => 'Issue '.$index,
                            'status' => ['name' => 'Open'],
                            'issuetype' => ['name' => 'Bug'],
                            'updated' => 1 === $index ? '2026-07-25T12:30:00+03:00' : null,
                        ],
                    ]],
                ], \JSON_THROW_ON_ERROR);
            });

        $request = (new JiraTaskSearchRequest())
            ->setReportedByMe(true)
            ->setProjects('abc, XYZ, abc');
        $issues = iterator_to_array($this->serviceWithClient($client)->searchIssues($request));

        self::assertCount(2, $issues);
        self::assertSame(
            '(assignee = currentUser() OR reporter = currentUser()) AND resolution IS EMPTY AND project IN ("ABC", "XYZ") ORDER BY updated DESC',
            $requests[0]['jql'],
        );
        self::assertSame(0, $requests[0]['startAt']);
        self::assertSame(1, $requests[1]['startAt']);
        self::assertSame(50, $requests[0]['maxResults']);
        self::assertSame(['summary', 'status', 'issuetype', 'updated'], $requests[0]['fields']);
        self::assertSame('Bug', $issues[0]['issueType']);
        self::assertSame('2026-07-25T12:30:00+03:00', $issues[0]['updated']);
        self::assertNull($issues[1]['updated']);
    }

    /**
     * @dataProvider unsupportedLegacyStatusProvider
     */
    public function testUnsupportedLegacyStatusFallsBackToEnhancedSearch(int $status): void
    {
        $client = $this->issueServiceMock();
        $client
            ->expects(self::once())
            ->method('exec')
            ->willThrowException(new JiraException('unsupported', $status));
        $client
            ->expects(self::once())
            ->method('search')
            ->with(
                self::stringContains('currentUser()'),
                '',
                50,
                ['summary', 'status', 'issuetype', 'updated'],
            )
            ->willReturn($this->searchResult([$this->issue('ABC-1')]));

        $issues = iterator_to_array(
            $this->serviceWithClient($client)->searchIssues(new JiraTaskSearchRequest()),
        );

        self::assertSame('ABC-1', $issues[0]['key']);
        self::assertSame('2026-07-25T12:30:00+03:00', $issues[0]['updated']);
    }

    /**
     * @return array<string, array{int}>
     */
    public function unsupportedLegacyStatusProvider(): array
    {
        return [
            'not found' => [404],
            'method not allowed' => [405],
            'gone' => [410],
        ];
    }

    public function testEnhancedSearchUsesNextPageTokenPagination(): void
    {
        $client = $this->issueServiceMock();
        $client->method('exec')->willThrowException(new JiraException('unsupported', 404));
        $first = $this->searchResult([$this->issue('ABC-1')], 'next');
        $second = $this->searchResult([$this->issue('ABC-2')]);
        $client
            ->expects(self::exactly(2))
            ->method('search')
            ->willReturnCallback(static function (
                string $jql,
                string $token,
                int $maxResults,
                array $fields,
            ) use ($first, $second): IssueSearchResult {
                self::assertSame(80, $maxResults);
                self::assertSame(['summary', 'status', 'issuetype', 'updated'], $fields);

                return 'next' === $token ? $second : $first;
            });

        $issues = iterator_to_array(
            $this->serviceWithClient($client)->searchIssues(
                (new JiraTaskSearchRequest())->setLimit(80),
            ),
        );

        self::assertSame(['ABC-1', 'ABC-2'], array_column($issues, 'key'));
    }

    /**
     * @dataProvider nonFallbackStatusProvider
     */
    public function testOtherLegacyFailuresDoNotFallBack(int $status): void
    {
        $client = $this->issueServiceMock();
        $client->method('exec')->willThrowException(new JiraException('sensitive response', $status, response: 'secret'));
        $client->expects(self::never())->method('search');

        try {
            iterator_to_array($this->serviceWithClient($client)->searchIssues(new JiraTaskSearchRequest()));
            self::fail('Expected JiraApiServiceException.');
        } catch (JiraApiServiceException $e) {
            self::assertSame(JiraApiService::SEARCH_ERROR_MSG, $e->getMessage());
            self::assertStringNotContainsString('secret', $e->getMessage());
        }
    }

    /**
     * @return array<string, array{int}>
     */
    public function nonFallbackStatusProvider(): array
    {
        return [
            'bad request' => [400],
            'unauthorized' => [401],
            'forbidden' => [403],
            'rate limited' => [429],
            'server error' => [500],
        ];
    }

    private function issueServiceMock(): IssueService
    {
        return $this->getMockBuilder(IssueService::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['exec', 'search'])
            ->getMock();
    }

    private function serviceWithClient(IssueService $client): JiraApiService
    {
        return new class(
            $this->createMock(LoggerInterface::class),
            $this->createMock(SettingService::class),
            $client,
        ) extends JiraApiService {
            public function __construct(
                LoggerInterface $logger,
                SettingService $settingService,
                private readonly IssueService $issueService,
            ) {
                parent::__construct($logger, $settingService);
            }

            protected function initClient(): IssueService
            {
                return $this->issueService;
            }
        };
    }

    private function issue(string $key): Issue
    {
        $status = new IssueStatus();
        $status->name = 'Open';
        $issueType = new IssueType();
        $issueType->name = 'Task';
        $fields = new IssueField();
        $fields->summary = 'Summary '.$key;
        $fields->status = $status;
        $fields->issuetype = $issueType;
        $fields->updated = new \DateTimeImmutable('2026-07-25T12:30:00+03:00');
        $issue = new Issue();
        $issue->key = $key;
        $issue->fields = $fields;

        return $issue;
    }

    /**
     * @param Issue[] $issues
     */
    private function searchResult(array $issues, ?string $nextPageToken = null): IssueSearchResult
    {
        $result = new IssueSearchResult();
        $result->issues = $issues;
        $result->nextPageToken = $nextPageToken;

        return $result;
    }
}
