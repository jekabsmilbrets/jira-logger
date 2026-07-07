import { concat, map, type Observable, of, toArray } from 'rxjs';

import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import type { ImportTagInput, ImportTaskInput } from '@tasks/interfaces/import-task-input.interface';
import { normalizeBackupKey } from '@tasks/utilities/task-backup-normalization.utility';

export class TaskImportExecutionPlan {
  public static fromTasks(
    tasks: ImportTaskInput[],
  ): TaskImportExecutionPlan {
    const tagsByName: Map<string, Tag> = new Map<string, Tag>();
    const missingTags: ImportTagInput[] = [];
    const plannedTagNames: Set<string> = new Set<string>();

    tasks.forEach((task: ImportTaskInput) => {
      task.tags.forEach((tag: ImportTagInput) => {
        if (tag.existingTagId) {
          tagsByName.set(normalizeBackupKey(tag.name), new Tag({
            id: tag.existingTagId,
            name: tag.name,
          }));
        }
      });
    });

    tasks.forEach((task: ImportTaskInput) => {
      task.tags.forEach((tag: ImportTagInput) => {
        const normalizedTagName: string = normalizeBackupKey(tag.name);

        if (tag.existingTagId || tagsByName.has(normalizedTagName) || plannedTagNames.has(normalizedTagName)) {
          return;
        }

        plannedTagNames.add(normalizedTagName);
        missingTags.push(tag);
      });
    });

    return new TaskImportExecutionPlan(tagsByName, missingTags, 0);
  }

  private constructor(
    private readonly tagsByName: Map<string, Tag>,
    private readonly missingTags: ImportTagInput[],
    public readonly createdTagCount: number,
  ) {}

  public createMissingTags(
    tagsService: TagsService,
  ): Observable<TaskImportExecutionPlan> {
    if (this.missingTags.length === 0) {
      return of(this);
    }

    return concat(
      ...this.missingTags.map((tag: ImportTagInput) => tagsService.create(new Tag({ name: tag.name }))),
    )
      .pipe(
        toArray(),
        map((createdTags: Tag[]) => {
          const tagsByName: Map<string, Tag> = new Map<string, Tag>(this.tagsByName);
          createdTags.forEach((tag: Tag) => tagsByName.set(normalizeBackupKey(tag.name), tag));

          return new TaskImportExecutionPlan(tagsByName, [], createdTags.length);
        }),
      );
  }

  public resolveTag(
    tag: ImportTagInput,
  ): Tag {
    const existingTag: Tag | undefined = this.tagsByName.get(normalizeBackupKey(tag.name));

    if (!existingTag) {
      throw new Error(`Missing tag "${ tag.name }" after tag creation.`);
    }

    return existingTag;
  }
}
