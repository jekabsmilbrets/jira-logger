<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\Seed\SeedManager;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'seed:tag',
    description: 'Load the tag seed.',
)]
class SeedTagCommand extends Command
{
    public function __construct(
        private readonly SeedManager $seedManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $this->seedManager->load('tag');

        (new SymfonyStyle($input, $output))->success('Loaded seed "tag".');

        return Command::SUCCESS;
    }
}
