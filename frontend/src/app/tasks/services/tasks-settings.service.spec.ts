import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { of } from 'rxjs';
import { vi } from 'vitest';

import { Task } from '@shared/models/task.model';

import { TasksSettingsDialogComponent } from '@tasks/components/tasks-menu/settings-dialog/tasks-settings-dialog.component';

import { TasksSettingsService } from './tasks-settings.service';

describe('Tasks Services tasks-settings.service', () => {
  let service: TasksSettingsService;

  const dialogRefMock = {
    afterClosed: vi.fn(),
  };

  const matDialogMock = {
    open: vi.fn(),
  };

  beforeEach(() => {
    dialogRefMock.afterClosed.mockReset();
    matDialogMock.open.mockReset();

    TestBed.configureTestingModule({
      providers: [
        TasksSettingsService,
        {
          provide: MatDialog,
          useValue: matDialogMock,
        },
      ],
    });

    service = TestBed.inject(TasksSettingsService);
  });

  it('opens settings dialog with current tasks and returns afterClosed stream', () => {
    const currentTasks = [new Task({ id: '1', name: 'Task 1', timeLogs: [], tags: [] })];
    const closeResult = [{ name: 'Imported', timeLogs: [], tags: [] }];

    dialogRefMock.afterClosed.mockReturnValue(of(closeResult));
    matDialogMock.open.mockReturnValue(dialogRefMock);

    let result: unknown;
    service.openDialog(currentTasks).subscribe((value) => {
      result = value;
    });

    expect(matDialogMock.open).toHaveBeenCalledWith(TasksSettingsDialogComponent, {
      data: {
        currentTasks,
      },
    });
    expect(dialogRefMock.afterClosed).toHaveBeenCalledTimes(1);
    expect(result).toEqual(closeResult);
  });
});
