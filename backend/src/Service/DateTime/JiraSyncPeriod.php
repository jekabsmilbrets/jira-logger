<?php

declare(strict_types=1);

namespace App\Service\DateTime;

final class JiraSyncPeriod
{
    public function __construct(
        private readonly \DateTime $syncDate,
        private readonly \DateTimeImmutable $startDate,
        private readonly \DateTimeImmutable $endDate,
        private readonly \DateTime $jiraStartDateTime,
    ) {
    }

    public function syncDate(): \DateTime
    {
        return clone $this->syncDate;
    }

    public function startDate(): \DateTimeImmutable
    {
        return $this->startDate;
    }

    public function endDate(): \DateTimeImmutable
    {
        return $this->endDate;
    }

    public function jiraStartDateTime(): \DateTime
    {
        return clone $this->jiraStartDateTime;
    }
}
