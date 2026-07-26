import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { of } from 'rxjs';
import { vi } from 'vitest';

import { TimeLog } from '@shared/models/time-log.model';

import { TimeLogModal } from '@tasks/components/task-list/task/time-log-list-modal/time-log-modal/time-log-modal';

import { TimeLogEdit } from './time-log-edit';

describe('Tasks Services time-log-edit', () => {
  let service: TimeLogEdit;

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
        TimeLogEdit,
        {
          provide: MatDialog,
          useValue: matDialogMock,
        },
      ],
    });

    service = TestBed.inject(TimeLogEdit);
  });

  it('opens time log dialog with time log and returns close stream', () => {
    const timeLog = new TimeLog({
      id: '2',
      startTime: new Date('2026-01-01T10:00:00.000Z'),
      endTime: new Date('2026-01-01T11:00:00.000Z'),
    });
    const closeValue = { deleted: true };

    dialogRefMock.afterClosed.mockReturnValue(of(closeValue));
    matDialogMock.open.mockReturnValue(dialogRefMock);

    let result: unknown;
    service.openTimeLogDialog(timeLog).subscribe((value) => {
      result = value;
    });

    expect(matDialogMock.open).toHaveBeenCalledWith(TimeLogModal, {
      data: {
        timeLog,
      },
    });
    expect(result).toEqual(closeValue);
  });
});
