import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { of } from 'rxjs';
import { vi } from 'vitest';

import { Task } from '@shared/models/task.model';

import { TimeLogListModalComponent } from '@tasks/components/task-list/task/time-log-list-modal/time-log-list-modal.component';

import { TimeLogListService } from './time-log-list.service';

describe('Tasks Services time-log-list.service', () => {
  let service: TimeLogListService;

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
        TimeLogListService,
        {
          provide: MatDialog,
          useValue: matDialogMock,
        },
      ],
    });

    service = TestBed.inject(TimeLogListService);
  });

  it('opens time log list dialog with task and returns close stream', () => {
    const task = new Task({ id: '1', name: 'Task 1', timeLogs: [], tags: [] });
    const closeValue = { updated: true };

    dialogRefMock.afterClosed.mockReturnValue(of(closeValue));
    matDialogMock.open.mockReturnValue(dialogRefMock);

    let result: unknown;
    service.openTimeLogsListDialog(task).subscribe((value) => {
      result = value;
    });

    expect(matDialogMock.open).toHaveBeenCalledWith(TimeLogListModalComponent, {
      data: {
        task,
      },
    });
    expect(result).toEqual(closeValue);
  });
});
