<?php

declare(strict_types=1);

namespace App\Repository\Task;

use App\Entity\Task\Task;
use App\Service\DateTime\TaskFilterDateRangeResolver;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Ramsey\Uuid\Uuid;

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
        private readonly TaskFilterDateRangeResolver $taskFilterDateRangeResolver,
    )
    {
        parent::__construct($registry, Task::class);
    }

    final public function add(Task $task, bool $flush = false): void
    {
        $this->save($task, $flush);
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
     * @throws \Exception
     */
    final public function findByFilters(array $filter): array
    {
        $queryBuilder = $this->createQueryBuilder('t')
            ->leftJoin('t.timeLogs', 'l')
            ->leftJoin('t.tags', 'tags');

        if (
            isset($filter['tags'])
        ) {
            $tags = explode(',', $filter['tags']);
            $map_fn = static fn (string $tag): string => trim($tag);
            $filter_fn = static fn (string $uuid) => Uuid::isValid($uuid);

            $tags = array_filter(
                array: array_map(
                    callback: $map_fn,
                    array: $tags
                ),
                callback: $filter_fn,
            );

            if (\count($tags) > 0) {
                $queryBuilder
                    ->andWhere('tags.id IN (:tagIds)')
                    ->setParameter('tagIds', $tags);
            }
        }

        $dateRange = $this->taskFilterDateRangeResolver->resolve($filter);
        if (null !== $dateRange) {
            $startDate = $dateRange['startDate'];
            $endDate = $dateRange['endDate'];

            $queryBuilder
                ->andWhere(
                    '(l.startTime <= :endTime AND (l.endTime IS NULL OR l.endTime >= :startTime))'
                )
                ->setParameter('startTime', $startDate)
                ->setParameter('endTime', $endDate);
        }

        if (\array_key_exists('name', $filter)) {
            $name = trim($filter['name']);

            if ('' !== $name) {
                $queryBuilder
                    ->andWhere('lower(t.name) LIKE lower(:name)')
                    ->setParameter('name', '%'.$name.'%');
            }
        }

        return $queryBuilder
            ->getQuery()
            ->getResult();
    }

//    /**
//     * @return Task[] Returns an array of Task objects
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

//    public function findOneBySomeField($value): ?Task
//    {
//        return $this->createQueryBuilder('t')
//            ->andWhere('t.exampleField = :val')
//            ->setParameter('val', $value)
//            ->getQuery()
//            ->getOneOrNullResult()
//        ;
//    }
}
