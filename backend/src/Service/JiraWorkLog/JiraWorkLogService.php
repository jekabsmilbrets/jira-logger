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

class JiraWorkLogService
{
    final public const NO_DATA_PROVIDED = 'No JiraWorkLog Model or JiraWorkLogRequest was provided';

    public function __construct(
        private readonly JiraWorkLogRepository $jiraWorkLogRepository,
        private readonly ?TaskService $taskService = null,
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
        ?JiraWorkLogRequest $jiraWorkLogRequest = null,
        ?JiraWorkLog $jiraWorkLog = null,
        bool $flush = true,
    ): JiraWorkLog {
        if (!$jiraWorkLogRequest && !$jiraWorkLog) {
            throw new \RuntimeException(self::NO_DATA_PROVIDED);
        }

        if ($jiraWorkLogRequest && !$jiraWorkLog) {
            $jiraWorkLog = JiraWorkLogFactory::create(
                jiraWorkLogRequest: $jiraWorkLogRequest,
                task: $this->task((string) $jiraWorkLogRequest->getTask())
            );
        }

        $this->jiraWorkLogRepository->save(
            entity: $jiraWorkLog,
            flush: $flush
        );

        return $jiraWorkLog;
    }

    final public function edit(
        string $id,
        ?JiraWorkLogRequest $jiraWorkLogRequest = null,
        ?JiraWorkLog $jiraWorkLog = null,
        bool $flush = true,
    ): ?JiraWorkLog {
        switch (true) {
            case !$jiraWorkLogRequest && !$jiraWorkLog:
                throw new \RuntimeException(self::NO_DATA_PROVIDED);

            case $jiraWorkLogRequest && !$jiraWorkLog:
                $jiraWorkLog = $this->jiraWorkLogRepository->find($id);

                if (!$jiraWorkLog instanceof JiraWorkLog) {
                    return null;
                }

                $jiraWorkLog = JiraWorkLogFactory::create(
                    jiraWorkLogRequest: $jiraWorkLogRequest,
                    task: $this->task((string) $jiraWorkLogRequest->getTask()),
                    jiraWorkLog: $jiraWorkLog
                );
                break;
        }

        if ($flush) {
            $this->jiraWorkLogRepository->flush();
        }

        return $jiraWorkLog;
    }

    final public function delete(
        string $id,
        bool $flush = true,
    ): bool {
        $jiraWorkLog = $this->jiraWorkLogRepository->find($id);

        if (!$jiraWorkLog instanceof JiraWorkLog) {
            return false;
        }

        $this->jiraWorkLogRepository->remove(
            entity: $jiraWorkLog,
            flush: $flush
        );

        return true;
    }

    private function task(string $taskId): Task
    {
        if (!$this->taskService instanceof TaskService) {
            throw new \LogicException('TaskService is required for JiraWorkLog task lookup.');
        }

        $task = $this->taskService->show($taskId);

        if (!$task instanceof Task) {
            throw new \RuntimeException('Task not found');
        }

        return $task;
    }
}
