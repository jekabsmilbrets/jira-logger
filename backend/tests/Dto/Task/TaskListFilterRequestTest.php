<?php

declare(strict_types=1);

namespace App\Tests\Dto\Task;

use App\Dto\Task\JiraTaskSearchRequest;
use App\Dto\Task\TaskListFilterRequest;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Serializer\Exception\UnexpectedValueException;
use Symfony\Component\Validator\Validation;

class TaskListFilterRequestTest extends TestCase
{
    private function createRequest(): TaskListFilterRequest
    {
        return new TaskListFilterRequest();
    }

    public function testHideUnreportedSupportsBooleanStringTrue(): void
    {
        $request = $this->createRequest();
        $request->setHideUnreported('true');

        self::assertTrue($request->getHideUnreported());
    }

    public function testHideUnreportedSupportsBooleanStringFalse(): void
    {
        $request = $this->createRequest();
        $request->setHideUnreported('false');

        self::assertFalse($request->getHideUnreported());
    }

    public function testDateStoresUnixTimestampMilliseconds(): void
    {
        $request = $this->createRequest();
        $request->setDate('1735689600000');

        self::assertSame('1735689600000', $request->getDate());
    }

    public function testStartDateStoresIsoDateTime(): void
    {
        $request = $this->createRequest();
        $request->setStartDate('2026-05-31T14:30:45Z');

        self::assertSame('2026-05-31T14:30:45Z', $request->getStartDate());
    }

    public function testEndDateStoresEuSlashDate(): void
    {
        $request = $this->createRequest();
        $request->setEndDate('31/05/2026');

        self::assertSame('31/05/2026', $request->getEndDate());
    }

    public function testRangeDateOnlyInputsStayDateOnly(): void
    {
        $request = $this->createRequest();
        $request->setStartDate('2026-06-05');
        $request->setEndDate('2026-06-06');

        self::assertSame('2026-06-05', $request->getStartDate());
        self::assertSame('2026-06-06', $request->getEndDate());
    }

    public function testJiraSearchDefaultsAndProjectNormalization(): void
    {
        $request = (new JiraTaskSearchRequest())->setProjects(' abc, XYZ,abc ');

        self::assertTrue($request->isAssignedToMe());
        self::assertFalse($request->isReportedByMe());
        self::assertSame('unresolved', $request->getResolution());
        self::assertSame(['ABC', 'XYZ'], $request->getProjectKeys());
        self::assertSame(50, $request->getLimit());
    }

    public function testJiraSearchRejectsMalformedBoolean(): void
    {
        $this->expectException(UnexpectedValueException::class);

        (new JiraTaskSearchRequest())->setAssignedToMe('sometimes');
    }

    public function testJiraSearchClampsNumericLimits(): void
    {
        self::assertSame(50, (new JiraTaskSearchRequest())->setLimit(-1)->getLimit());
        self::assertSame(75, (new JiraTaskSearchRequest())->setLimit('75')->getLimit());
        self::assertSame(200, (new JiraTaskSearchRequest())->setLimit(999)->getLimit());
    }

    public function testJiraSearchRejectsMalformedLimit(): void
    {
        $this->expectException(UnexpectedValueException::class);

        (new JiraTaskSearchRequest())->setLimit('many');
    }

    public function testJiraSearchRequiresAnEffectiveCriterion(): void
    {
        $request = (new JiraTaskSearchRequest())
            ->setAssignedToMe(false)
            ->setReportedByMe(false)
            ->setResolution('all');

        $errors = Validation::createValidatorBuilder()
            ->enableAttributeMapping()
            ->getValidator()
            ->validate($request, groups: ['jira-search']);

        self::assertCount(1, $errors);
        self::assertSame('criteria', $errors[0]->getPropertyPath());
    }

    public function testJiraSearchRejectsInvalidResolutionAndProjectKey(): void
    {
        $request = (new JiraTaskSearchRequest())
            ->setResolution('pending')
            ->setProjects('bad key');

        $errors = Validation::createValidatorBuilder()
            ->enableAttributeMapping()
            ->getValidator()
            ->validate($request, groups: ['jira-search']);

        self::assertCount(2, $errors);
    }
}
