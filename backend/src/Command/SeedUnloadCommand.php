<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\Seed\SeedManager;
use InvalidArgumentException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'seed:unload',
    description: 'Unload a seed.',
)]
class SeedUnloadCommand extends Command
{
    public function __construct(
        private readonly SeedManager $seedManager,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('seed', InputArgument::REQUIRED, 'Seed name.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $seedName = (string) $input->getArgument('seed');

        try {
            $this->seedManager->unload($seedName);
        } catch (InvalidArgumentException $exception) {
            $io->error($exception->getMessage());
            $io->writeln(sprintf('Supported seeds: %s', implode(', ', $this->seedManager->supportedSeeds())));

            return Command::INVALID;
        }

        $io->success(sprintf('Unloaded seed "%s".', $seedName));

        return Command::SUCCESS;
    }
}
