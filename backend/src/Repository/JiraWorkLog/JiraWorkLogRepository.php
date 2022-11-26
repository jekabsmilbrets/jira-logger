<?php

declare(strict_types=1);

namespace App\Repository\JiraWorkLog;

use App\Entity\JiraWorkLog\JiraWorkLog;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<JiraWorkLog>
 *
 * @method JiraWorkLog|null find($id, $lockMode = null, $lockVersion = null)
 * @method JiraWorkLog|null findOneBy(array $criteria, array $orderBy = null)
 * @method JiraWorkLog[]    findAll()
 * @method JiraWorkLog[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 *
 * @noinspection MethodShouldBeFinalInspection
 */
class JiraWorkLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, JiraWorkLog::class);
    }

    final public function add(JiraWorkLog $entity, bool $flush = false): void
    {
        $this->save($entity, $flush);
    }

    final public function save(JiraWorkLog $entity, bool $flush = false): void
    {
        $this->getEntityManager()->persist($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    final public function remove(JiraWorkLog $entity, bool $flush = false): void
    {
        $this->getEntityManager()->remove($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    final public function flush(): void
    {
        $this->getEntityManager()->flush();
    }

//    /**
//     * @return JiraWorkLog[] Returns an array of JiraWorkLog objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('j')
//            ->andWhere('j.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('j.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

//    public function findOneBySomeField($value): ?JiraWorkLog
//    {
//        return $this->createQueryBuilder('j')
//            ->andWhere('j.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
