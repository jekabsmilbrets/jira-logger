<?php

declare(strict_types=1);

namespace App\Tests\Command;

use App\Command\AuditJiraSyncDataCommand;
use Doctrine\DBAL\Connection;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\BufferedOutput;

class AuditJiraSyncDataCommandTest extends TestCase
{
    public function testExecuteReturnsSuccessWhenNoSuspiciousRowsFound(): void
    {
        $connection = $this->createMock(Connection::class);
        $connection->expects(self::exactly(2))
            ->method('fetchAllAssociative')
            ->willReturnOnConsecutiveCalls([], []);

        $command = new AuditJiraSyncDataCommand($connection);
        $reflection = new \ReflectionClass($command);
        $method = $reflection->getMethod('execute');
        $method->setAccessible(true);

        $result = $method->invoke($command, new ArrayInput([]), new BufferedOutput());

        self::assertSame(Command::SUCCESS, $result);
    }
}
