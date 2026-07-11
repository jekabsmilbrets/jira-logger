import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { Tag } from '@shared/models/tag.model';

import { TaskImportExecutionPlan } from './task-import-execution-plan.utility';

describe('Tasks Utility TaskImportExecutionPlan', () => {
  it('creates each missing tag once and resolves tags by normalized name', async () => {
    const plan = TaskImportExecutionPlan.fromTasks([
      { name: 'Task A', timeLogs: [], tags: [{ name: ' New Tag ' }, { name: 'new tag' }] },
      { name: 'Task B', timeLogs: [], tags: [{ name: 'Existing', existingTagId: 'tag-1' }] },
    ]);
    const create = vi.fn().mockReturnValue(of(new Tag({ id: 'tag-2', name: 'New Tag' })));

    const createdPlan = await firstValueFrom(plan.createMissingTags({ create } as any));

    expect(create).toHaveBeenCalledTimes(1);
    expect(createdPlan.createdTagCount).toBe(1);
    expect(createdPlan.resolveTag({ name: ' new tag ' }).id).toBe('tag-2');
    expect(createdPlan.resolveTag({ name: 'existing' }).id).toBe('tag-1');
  });

  it('fails when a tag has not been created', () => {
    const plan = TaskImportExecutionPlan.fromTasks([]);

    expect(() => plan.resolveTag({ name: 'Missing' })).toThrow('Missing tag "Missing" after tag creation.');
  });
});
