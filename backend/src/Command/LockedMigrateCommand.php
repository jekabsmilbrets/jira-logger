<?php

declare(strict_types=1);

namespace App\Command;

use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:migrate', description: 'Run migrations under the shared PHP/Node advisory lock.')]
final class LockedMigrateCommand extends Command
{
    private const LOCK = 20221216190644;

    public function __construct(private readonly Connection $connection)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $this->connection->executeQuery('SELECT pg_advisory_lock(?)', [self::LOCK]);
        try {
            $arguments = new ArrayInput(['--no-interaction' => true]);
            $arguments->setInteractive(false);

            return $this->getApplication()->find('doctrine:migrations:migrate')->run($arguments, $output);
        } finally {
            $this->connection->executeQuery('SELECT pg_advisory_unlock(?)', [self::LOCK]);
        }
    }
}
