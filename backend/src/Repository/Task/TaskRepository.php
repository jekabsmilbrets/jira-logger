<?php

declare(strict_types=1);

namespace App\Repository\Task;

use App\Entity\Task\Task;
use App\Service\Task\Filter\TaskFilterCriteria;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Task>
 *
 * @method Task|null find($id, $lockMode = null, $lockVersion = null)
 * @method Task|null findOneBy(array $criteria, array $orderBy = null)
 * @method Task[]    findAll()
 * @method Task[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 *
 * @noinspection MethodShouldBeFinalInspection
 */
class TaskRepository extends ServiceEntityRepository
{
    public function __construct(
        ManagerRegistry $registry,
    )
    {
        parent::__construct($registry, Task::class);
    }

    final public function save(Task $task, bool $flush = false): void
    {
        $this->getEntityManager()->persist($task);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    final public function flush(): void
    {
        $this->getEntityManager()->flush();
    }

    final public function remove(Task $task, bool $flush = false): void
    {
        $this->getEntityManager()->remove($task);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * @return Task[]
     *
     * @throws \Exception
     */
    final public function findByFilters(TaskFilterCriteria $criteria): array
    {
        $queryBuilder = $this->createQueryBuilder('t')
            ->leftJoin('t.timeLogs', 'l')
            ->leftJoin('t.tags', 'tags');

        if ([] !== $criteria->tagIds) {
            $queryBuilder
                ->andWhere('tags.id IN (:tagIds)')
                ->setParameter('tagIds', $criteria->tagIds);
        }

        if (null !== $criteria->dateRange) {
            $startDate = $criteria->dateRange['startDate'];
            $endDate = $criteria->dateRange['endDate'];

            $queryBuilder
                ->andWhere(
                    '(l.startTime <= :endTime AND (l.endTime IS NULL OR l.endTime >= :startTime))'
                )
                ->setParameter('startTime', $startDate)
                ->setParameter('endTime', $endDate);
        }

        if (null !== $criteria->name) {
            $queryBuilder
                ->andWhere('lower(t.name) LIKE lower(:name)')
                ->setParameter('name', '%'.$criteria->name.'%');
        }

        return $queryBuilder
            ->getQuery()
            ->getResult();
    }

}
