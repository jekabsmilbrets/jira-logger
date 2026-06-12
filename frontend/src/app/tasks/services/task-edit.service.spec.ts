import { TestBed } from '@angular/core/testing';

import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';

import { TaskEditService } from './task-edit.service';

describe('Tasks Services task-edit.service', () => {
  let service: TaskEditService;

  const tasksSubject = new BehaviorSubject<Task[]>([]);
  const tagsSubject = new BehaviorSubject<Tag[]>([]);

  const tasksServiceMock = {
    tasks$: tasksSubject.asObservable(),
  };

  const tagsServiceMock = {
    tags$: tagsSubject.asObservable(),
  };

  beforeEach(() => {
    tasksSubject.next([]);
    tagsSubject.next([]);

    TestBed.configureTestingModule({
      providers: [
        TaskEditService,
        {
          provide: TasksService,
          useValue: tasksServiceMock,
        },
        {
          provide: TagsService,
          useValue: tagsServiceMock,
        },
      ],
    });

    service = TestBed.inject(TaskEditService);
  });

  it('creates form group with current task values', () => {
    const tag = new Tag({ id: '10', name: 'Frontend' });
    const task = new Task({
      id: '1',
      name: 'Task A',
      description: 'Description',
      tags: [tag],
      timeLogs: [],
    });

    const formGroup = service.createFormGroup(task);

    expect(formGroup.getRawValue()).toEqual({
      name: 'Task A',
      description: 'Description',
      tags: [tag],
    });
  });

  it('returns duplicate-task async error when another task already has the same name', async () => {
    const currentTask = new Task({ id: '1', name: 'Task A', tags: [], timeLogs: [] });
    const duplicateTask = new Task({ id: '2', name: 'Task B', tags: [], timeLogs: [] });

    tasksSubject.next([currentTask, duplicateTask]);

    const formGroup = service.createFormGroup(currentTask);
    const control = formGroup.get('name');

    if (!control?.asyncValidator) {
      throw new Error('Expected async validator to exist');
    }

    control.setValue('Task B');
    const result = await firstValueFrom(control.asyncValidator(control) as any);

    expect(result).toEqual({ 'duplicate-task': true });
  });

  it('allows same name for the current task id', async () => {
    const currentTask = new Task({ id: '1', name: 'Task A', tags: [], timeLogs: [] });

    tasksSubject.next([currentTask]);

    const formGroup = service.createFormGroup(currentTask);
    const control = formGroup.get('name');

    if (!control?.asyncValidator) {
      throw new Error('Expected async validator to exist');
    }

    control.setValue('Task A');
    const result = await firstValueFrom(control.asyncValidator(control) as any);

    expect(result).toBeNull();
  });
});
