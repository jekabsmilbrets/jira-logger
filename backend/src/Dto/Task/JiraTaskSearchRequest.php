<?php

declare(strict_types=1);

namespace App\Dto\Task;

use Symfony\Component\Serializer\Exception\UnexpectedValueException;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

class JiraTaskSearchRequest
{
    final public const DEFAULT_LIMIT = 50;
    final public const MIN_LIMIT = 50;
    final public const MAX_LIMIT = 200;

    private ?bool $assignedToMe = true;

    private ?bool $reportedByMe = false;

    #[Assert\Choice(choices: ['all', 'unresolved', 'resolved'], groups: ['jira-search'])]
    private string $resolution = 'unresolved';

    #[Assert\Regex(
        pattern: '/^[A-Z][A-Z0-9_]{1,9}(?:\s*,\s*[A-Z][A-Z0-9_]{1,9})*$/i',
        message: 'Project keys must be comma-separated Jira project keys.',
        groups: ['jira-search'],
    )]
    private ?string $projects = null;

    private int $limit = self::DEFAULT_LIMIT;

    public function isAssignedToMe(): bool
    {
        return true === $this->assignedToMe;
    }

    public function setAssignedToMe(bool|string|null $assignedToMe): self
    {
        $this->assignedToMe = $this->normalizeBoolean($assignedToMe);

        return $this;
    }

    public function isReportedByMe(): bool
    {
        return true === $this->reportedByMe;
    }

    public function setReportedByMe(bool|string|null $reportedByMe): self
    {
        $this->reportedByMe = $this->normalizeBoolean($reportedByMe);

        return $this;
    }

    public function getResolution(): string
    {
        return $this->resolution;
    }

    public function setResolution(string $resolution): self
    {
        $this->resolution = strtolower(trim($resolution));

        return $this;
    }

    public function setProjects(?string $projects): self
    {
        $projects = null === $projects ? null : trim($projects);
        $this->projects = '' === $projects ? null : $projects;

        return $this;
    }

    public function getLimit(): int
    {
        return max(self::MIN_LIMIT, min(self::MAX_LIMIT, $this->limit));
    }

    public function setLimit(int|string $limit): self
    {
        if (\is_string($limit)) {
            $limit = filter_var(trim($limit), \FILTER_VALIDATE_INT);
            if (!\is_int($limit)) {
                throw new UnexpectedValueException('Malformed limit value.');
            }
        }

        $this->limit = $limit;

        return $this;
    }

    /**
     * @return string[]
     */
    public function getProjectKeys(): array
    {
        if (null === $this->projects) {
            return [];
        }

        return array_values(array_unique(array_map(
            static fn (string $key): string => strtoupper(trim($key)),
            explode(',', $this->projects),
        )));
    }

    #[Assert\Callback(groups: ['jira-search'])]
    public function validateEffectiveCriteria(ExecutionContextInterface $context): void
    {
        if (
            !$this->isAssignedToMe()
            && !$this->isReportedByMe()
            && 'all' === $this->resolution
            && [] === $this->getProjectKeys()
        ) {
            $context->buildViolation('Select at least one Jira search criterion.')
                ->atPath('criteria')
                ->addViolation();
        }
    }

    private function normalizeBoolean(bool|string|null $value): ?bool
    {
        if (!\is_string($value)) {
            return $value;
        }

        $normalized = filter_var($value, \FILTER_VALIDATE_BOOLEAN, \FILTER_NULL_ON_FAILURE);
        if (!\is_bool($normalized)) {
            throw new UnexpectedValueException('Malformed boolean value.');
        }

        return $normalized;
    }
}
