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

    final public function add(TimeLog $timeLog, bool $flush = false): void
    {
        $this->save($timeLog, $flush);
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

    /**
     * @throws Exception
     */
    final public function stopAllTimeLog(): int|string
    {
        $rawQuery = 'UPDATE time_log SET end_time = (NOW()) WHERE end_time IS NULL;';

        return $this->getEntityManager()
            ->getConnection()
            ->executeStatement($rawQuery);
    }

//    /**
//     * @return TimeLog[] Returns an array of TimeLog objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('t')
//            ->andWhere('t.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('t.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?TimeLog
//    {
//        return $this->createQueryBuilder('t')
//            ->andWhere('t.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
