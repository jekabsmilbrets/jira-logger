import { Service } from '@angular/core';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

import type { TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import type { TaskBackupV2 } from '@tasks/interfaces/task-backup.interface';
import {
  createTaskBackupV2,
  prepareTaskImportRequest,
} from '@tasks/utilities/task-backup.utility';

@Service()
export class TaskBackupService {
  public createTaskBackupV2(
  tasks: Task[],
  ): TaskBackupV2 {
    return createTaskBackupV2(tasks);
  }

  public stringifyTaskBackupV2(
    tasks: Task[],
  ): string {
    return JSON.stringify(
      this.createTaskBackupV2(tasks),
      null,
      2,
    );
  }

  public prepareTaskImportRequest(
    input: unknown,
    currentTasks: Task[],
    currentTags: Tag[],
  ): TaskImportRequest {
    return prepareTaskImportRequest(input, currentTasks, currentTags);
  }
}
