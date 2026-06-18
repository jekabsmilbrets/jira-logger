import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { of } from 'rxjs';
import { vi } from 'vitest';

import { TimeLog } from '@shared/models/time-log.model';

import { TimeLogModalComponent } from '@tasks/components/task-list/task/time-log-list-modal/time-log-modal/time-log-modal.component';

import { TimeLogEditService } from './time-log-edit.service';

describe('Tasks Services time-log-edit.service', () => {
  let service: TimeLogEditService;

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
        TimeLogEditService,
        {
          provide: MatDialog,
          useValue: matDialogMock,
        },
      ],
    });

    service = TestBed.inject(TimeLogEditService);
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

    expect(matDialogMock.open).toHaveBeenCalledWith(TimeLogModalComponent, {
      data: {
        timeLog,
      },
    });
    expect(result).toEqual(closeValue);
  });
});
