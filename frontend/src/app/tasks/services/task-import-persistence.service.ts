import { inject, Service } from '@angular/core';

import type { Observable } from 'rxjs';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

@Service()
export class TaskImportPersistence {
  private readonly tagsService: TagsService = inject(TagsService);
  private readonly tasksService: TasksService = inject(TasksService);
  private readonly timeLogsService: TimeLogsService = inject(TimeLogsService);

  public existingTaskNames(): Set<string> {
    return new Set<string>(
      this.tasksService.tasks().map((task: Task) => this.normalizeName(task.name)),
    );
  }

  public existingTagNames(): Set<string> {
    return new Set<string>(
      this.tagsService.tags().map((tag: Tag) => this.normalizeName(tag.name)),
    );
  }

  public findTag(
    tagName: string,
  ): Tag | undefined {
    const normalizedTagName: string = this.normalizeName(tagName);

    return this.tagsService.tags().find(
      (tag: Tag) => this.normalizeName(tag.name) === normalizedTagName,
    );
  }

  public createTag(
    tagName: string,
  ): Observable<Tag> {
    return this.tagsService.create(new Tag({ name: tagName }));
  }

  public createTask(
    task: Task,
  ): Observable<Task> {
    return this.tasksService.create(task);
  }

  public createTimeLog(
    task: Task,
    timeLog: TimeLog,
  ): Observable<TimeLog> {
    return this.timeLogsService.create(task, timeLog);
  }

  public normalizeName(
    value: string,
  ): string {
    return value.trim().toLowerCase();
  }
}
