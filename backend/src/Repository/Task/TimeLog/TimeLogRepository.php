<?php

declare(strict_types=1);

namespace App\Repository\Task\TimeLog;

use App\Entity\Task\TimeLog\TimeLog;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\Exception;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TimeLog>
 *
 * @method TimeLog|null find($id, $lockMode = null, $lockVersion = null)
 * @method TimeLog|null findOneBy(array $criteria, array $orderBy = null)
 * @method TimeLog[]    findAll()
 * @method TimeLog[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 *
 * @noinspection MethodShouldBeFinalInspection
 */
class TimeLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TimeLog::class);
    }

    final public function save(TimeLog $timeLog, bool $flush = false): void
    {
        $this->getEntityManager()->persist($timeLog);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    final public function flush(): void
    {
        $this->getEntityManager()->flush();
    }

    final public function remove(TimeLog $timeLog, bool $flush = false): void
    {
        $this->getEntityManager()->remove($timeLog);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function findActive(): ?TimeLog
    {
        /** @var TimeLog[] $timeLogs */
        $timeLogs = $this->createQueryBuilder('tl')
            ->andWhere('tl.endTime IS NULL')
            ->orderBy('tl.startTime', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getResult();

        return $timeLogs[0] ?? null;
    }

    /**
     * @return TimeLog[]
     */
    public function findOverlappingRange(
        \DateTimeInterface $rangeStart,
        \DateTimeInterface $rangeEnd,
    ): array {
        /** @var TimeLog[] $timeLogs */
        $timeLogs = $this->createQueryBuilder('tl')
            ->andWhere('tl.startTime <= :rangeEnd')
            ->andWhere('tl.endTime IS NULL OR tl.endTime >= :rangeStart')
            ->setParameter('rangeStart', $rangeStart)
            ->setParameter('rangeEnd', $rangeEnd)
            ->orderBy('tl.startTime', 'ASC')
            ->getQuery()
            ->getResult();

        return $timeLogs;
    }

    /**
     * @throws Exception
     */
    public function stopAllRunningTimeLogs(): int|string
    {
        $rawQuery = 'UPDATE time_log SET end_time = (NOW()) WHERE end_time IS NULL;';

        return $this->getEntityManager()
            ->getConnection()
            ->executeStatement($rawQuery);
    }
}
