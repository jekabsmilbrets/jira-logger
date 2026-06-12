<?php

declare(strict_types=1);

namespace App\Tests\Command;

use App\Command\AuditJiraSyncDataCommand;
use Doctrine\DBAL\Connection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;

class AuditJiraSyncDataCommandTest extends TestCase
{
    public function testExecuteReturnsSuccessWhenNoSuspiciousRowsFound(): void
    {
        $connection = $this->createMock(Connection::class);
        $connection->expects(self::exactly(2))
            ->method('fetchAllAssociative')
            ->willReturnOnConsecutiveCalls([], []);

        $command = new AuditJiraSyncDataCommand($connection);
        $tester = new CommandTester($command);

        $result = $tester->execute([]);

        self::assertSame(Command::SUCCESS, $result);
    }
}
