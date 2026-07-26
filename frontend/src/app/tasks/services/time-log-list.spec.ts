import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { of } from 'rxjs';
import { vi } from 'vitest';

import { Task } from '@shared/models/task.model';

import { TimeLogListModal } from '@tasks/components/task-list/task/time-log-list-modal/time-log-list-modal';

import { TimeLogList } from './time-log-list';

describe('Tasks Services time-log-list', () => {
  let service: TimeLogList;

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
        TimeLogList,
        {
          provide: MatDialog,
          useValue: matDialogMock,
        },
      ],
    });

    service = TestBed.inject(TimeLogList);
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

    expect(matDialogMock.open).toHaveBeenCalledWith(TimeLogListModal, {
      data: {
        task,
      },
    });
    expect(result).toEqual(closeValue);
  });
});
