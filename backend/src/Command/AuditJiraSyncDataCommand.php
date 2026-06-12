<?php

declare(strict_types=1);

namespace App\Command;

use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:audit:jira-sync-data',
    description: 'Audit suspicious Jira sync records and duplicate local Jira work logs.',
)]
class AuditJiraSyncDataCommand extends Command
{
    public function __construct(
        private readonly Connection $connection,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Jira sync data audit');

        $duplicateRows = $this->connection->fetchAllAssociative(
            <<<'SQL'
            SELECT
                task_id,
                start_time,
                work_log_id,
                COUNT(*) AS duplicate_count
            FROM jira_work_log
            GROUP BY task_id, start_time, work_log_id
            HAVING COUNT(*) > 1
            ORDER BY duplicate_count DESC, task_id ASC
            SQL
        );

        $invalidTimeLogs = $this->connection->fetchAllAssociative(
            <<<'SQL'
            SELECT
                id,
                task_id,
                start_time,
                end_time
            FROM time_log
            WHERE end_time IS NOT NULL
              AND end_time <= start_time
            ORDER BY task_id ASC, start_time ASC
            SQL
        );

        $io->section('Duplicate Jira work logs (same task/date/workLogId)');
        if ([] === $duplicateRows) {
            $io->success('No duplicate Jira work log groups found.');
        } else {
            $io->warning(sprintf('Found %d duplicate group(s).', count($duplicateRows)));
            $io->table(
                ['task_id', 'start_time', 'work_log_id', 'duplicate_count'],
                $duplicateRows
            );
        }

        $io->section('Suspicious local time logs');
        if ([] === $invalidTimeLogs) {
            $io->success('No invalid local time logs (end_time <= start_time) found.');
        } else {
            $io->warning(sprintf('Found %d suspicious time log row(s).', count($invalidTimeLogs)));
            $io->table(
                ['id', 'task_id', 'start_time', 'end_time'],
                $invalidTimeLogs
            );
        }

        $io->section('Remediation guidance');
        $io->listing([
            'Create a full database backup before any cleanup.',
            'Review duplicate groups with stakeholders and decide keeper row per group.',
            'If cleanup is approved, delete duplicates in a transaction and verify Jira consistency.',
            'For suspicious local logs, verify source activity history before correction.',
            'Document rollback steps and keep SQL cleanup scripts under version control.',
        ]);

        return Command::SUCCESS;
    }
}
