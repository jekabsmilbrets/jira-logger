<?php

declare(strict_types=1);

namespace App\Tests\Service\Task\ReportedTask;

use App\Dto\Task\TaskListFilterRequest;
use App\Entity\Tag\Tag;
use App\Entity\Task\Task;
use App\Entity\Task\TimeLog\TimeLog;
use App\Repository\Task\TaskRepository;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use App\Service\Task\ReportedTask\ReportedTaskQuery;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * @group legacy
 */
final class ReportedTaskQueryIntegrationTest extends KernelTestCase
{
    private EntityManagerInterface $entityManager;
    private SchemaTool $schemaTool;

    protected function setUp(): void
    {
        self::bootKernel();

        $this->entityManager = self::getContainer()->get(EntityManagerInterface::class);
        $this->schemaTool = new SchemaTool($this->entityManager);
        $this->schemaTool->dropDatabase();
        $this->schemaTool->createSchema($this->entityManager->getMetadataFactory()->getAllMetadata());
    }

    protected function tearDown(): void
    {
        $this->schemaTool->dropDatabase();
        $this->entityManager->close();

        parent::tearDown();
    }

    public function testQueryOwnsDoctrineSelectionAndReadProjection(): void
    {
        $tag = (new Tag())->setName('billable');
        $task = (new Task())
            ->setName('Backend delivery')
            ->addTag($tag)
            ->addTimeLog(
                (new TimeLog())
                    ->setStartTime(new \DateTimeImmutable('2026-05-29 10:00:00'))
                    ->setEndTime(new \DateTimeImmutable('2026-05-31 10:00:00')),
            );
        $this->entityManager->persist($tag);
        $this->entityManager->persist($task);
        $this->entityManager->flush();
        $tagId = $tag->getId();
        $this->entityManager->clear();

        $dateRange = [
            'startDate' => new \DateTimeImmutable('2026-05-30 00:00:00'),
            'endDate' => new \DateTimeImmutable('2026-05-30 23:59:59'),
        ];
        $resolver = $this->createMock(TaskFilterDateRangeResolver::class);
        $resolver->method('resolve')->willReturn($dateRange);
        $query = new ReportedTaskQuery(
            self::getContainer()->get(TaskRepository::class),
            $resolver,
        );

        $result = $query->list(
            (new TaskListFilterRequest())
                ->setName('backend')
                ->setTags($tagId)
                ->setDate('2026-05-30')
                ->setHideUnreported(true),
        );

        self::assertCount(1, $result);
        self::assertSame('Backend delivery', $result[0]->name);
        self::assertSame('2026-05-30 00:00:00', $result[0]->timeLogs[0]['startTime']->format('Y-m-d H:i:s'));
        self::assertSame('2026-05-30 23:59:59', $result[0]->timeLogs[0]['endTime']->format('Y-m-d H:i:s'));
    }
}
