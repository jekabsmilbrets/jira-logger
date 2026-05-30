import { TestBed } from '@angular/core/testing';

import { TasksService } from '@shared/services/tasks.service';
import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TaskCreateService } from './task-create.service';

describe('Tasks Services task-create.service', () => {
  let service: TaskCreateService;

  const tasksServiceMock = {
    taskExist: vi.fn(),
  };

  beforeEach(() => {
    tasksServiceMock.taskExist.mockReset();

    TestBed.configureTestingModule({
      providers: [
        TaskCreateService,
        {
          provide: TasksService,
          useValue: tasksServiceMock,
        },
      ],
    });

    service = TestBed.inject(TaskCreateService);
  });

  it('creates form group with required name and empty tags by default', () => {
    tasksServiceMock.taskExist.mockReturnValue(of(null));

    const formGroup = service.createFormGroup();

    expect(formGroup.get('name')?.hasError('required')).toBe(true);
    expect(formGroup.get('tags')?.value).toEqual([]);
  });

  it('returns no async validation errors when task name is unique', async () => {
    tasksServiceMock.taskExist.mockReturnValue(of(null));
    const formGroup = service.createFormGroup();
    const control = formGroup.get('name');

    if (!control?.asyncValidator) {
      throw new Error('Expected async validator to exist');
    }

    control.setValue('Unique task');
    const result = await firstValueFrom(control.asyncValidator(control) as any);

    expect(tasksServiceMock.taskExist).toHaveBeenCalledWith('Unique task');
    expect(result).toBeNull();
  });

  it('marks value as duplicate-task when task existence check fails', async () => {
    tasksServiceMock.taskExist.mockReturnValue(throwError(() => new Error('request failed')));
    const formGroup = service.createFormGroup();
    const control = formGroup.get('name');

    if (!control?.asyncValidator) {
      throw new Error('Expected async validator to exist');
    }

    control.setValue('Existing task');
    const result = await firstValueFrom(control.asyncValidator(control) as any);

    expect(result).toEqual({ 'duplicate-task': true });
  });
});
