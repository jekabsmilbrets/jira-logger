<?php

declare(strict_types=1);

namespace App\Service\JiraWorkLog;

use App\Dto\JiraWorkLog\JiraWorkLogRequest;
use App\Entity\JiraWorkLog\JiraWorkLog;
use App\Entity\Task\Task;
use App\Factory\JiraWorkLog\JiraWorkLogFactory;
use App\Repository\JiraWorkLog\JiraWorkLogRepository;
use App\Service\Task\TaskService;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;

class JiraWorkLogService
{
    final public const NO_DATA_PROVIDED = 'No JiraWorkLog Model or JiraWorkLogRequest was provided';

    public function __construct(
        private readonly JiraWorkLogRepository $jiraWorkLogRepository,
        private readonly TaskService $taskService,
    ) {
    }

    /**
     * @return ArrayCollection<int, JiraWorkLog>|null
     */
    final public function list(): ?ArrayCollection
    {
        $jiraWorkLogs = $this->jiraWorkLogRepository->findAll();

        if (empty($jiraWorkLogs)) {
            return null;
        }

        return new ArrayCollection($jiraWorkLogs);
    }

    /**
     * @param array<string, mixed> $criteria
     */
    final public function findOneBy(
        array $criteria
    ): ?JiraWorkLog {
        $jiraWorkLog = $this->jiraWorkLogRepository->findOneBy(
            $criteria
        );

        return $jiraWorkLog ?? null;
    }

    final public function findByName(string $name): ?JiraWorkLog
    {
        $jiraWorkLog = $this->jiraWorkLogRepository->findOneBy(
            [
                'name' => $name,
            ]
        );

        return $jiraWorkLog ?? null;
    }

    final public function show(
        string $id
    ): ?JiraWorkLog {
        $jiraWorkLog = $this->jiraWorkLogRepository->find($id);

        return $jiraWorkLog ?? null;
    }

    final public function new(
        JiraWorkLogRequest $jiraWorkLogRequest,
        bool $flush = true,
    ): JiraWorkLogWriteResult {
        try {
            $jiraWorkLog = JiraWorkLogFactory::create(
                jiraWorkLogRequest: $jiraWorkLogRequest,
                task: $this->task((string) $jiraWorkLogRequest->getTask())
            );
            $this->jiraWorkLogRepository->save(
                entity: $jiraWorkLog,
                flush: $flush
            );
        } catch (UniqueConstraintViolationException) {
            return JiraWorkLogWriteResult::duplicate();
        } catch (\RuntimeException) {
            return JiraWorkLogWriteResult::notFound();
        } catch (\Exception) {
            return JiraWorkLogWriteResult::failed();
        }

        return JiraWorkLogWriteResult::created($jiraWorkLog);
    }

    final public function edit(
        string $id,
        JiraWorkLogRequest $jiraWorkLogRequest,
        bool $flush = true,
    ): JiraWorkLogWriteResult {
        $jiraWorkLog = $this->jiraWorkLogRepository->find($id);

        if (!$jiraWorkLog instanceof JiraWorkLog) {
            return JiraWorkLogWriteResult::notFound();
        }

        try {
            $jiraWorkLog = JiraWorkLogFactory::create(
                jiraWorkLogRequest: $jiraWorkLogRequest,
                task: $this->task((string) $jiraWorkLogRequest->getTask()),
                jiraWorkLog: $jiraWorkLog
            );

            if ($flush) {
                $this->jiraWorkLogRepository->flush();
            }
        } catch (UniqueConstraintViolationException) {
            return JiraWorkLogWriteResult::duplicate();
        } catch (\RuntimeException) {
            return JiraWorkLogWriteResult::notFound();
        } catch (\Exception) {
            return JiraWorkLogWriteResult::failed();
        }

        return JiraWorkLogWriteResult::updated($jiraWorkLog);
    }

    final public function delete(
        string $id,
        bool $flush = true,
    ): JiraWorkLogWriteResult {
        $jiraWorkLog = $this->jiraWorkLogRepository->find($id);

        if (!$jiraWorkLog instanceof JiraWorkLog) {
            return JiraWorkLogWriteResult::notFound();
        }

        try {
            $this->jiraWorkLogRepository->remove(
                entity: $jiraWorkLog,
                flush: $flush
            );
        } catch (\Exception) {
            return JiraWorkLogWriteResult::failed();
        }

        return JiraWorkLogWriteResult::deleted();
    }

    private function task(string $taskId): Task
    {
        $task = $this->taskService->show($taskId);

        if (!$task instanceof Task) {
            throw new \RuntimeException('Task not found');
        }

        return $task;
    }
}
