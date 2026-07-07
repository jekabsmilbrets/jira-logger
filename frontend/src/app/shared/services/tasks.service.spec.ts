import { registerLocaleData } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import localeLv from '@angular/common/locales/lv';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom, of, throwError } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

import { Task } from '@shared/models/task.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import { ErrorDialogService } from '@shared/services/error-dialog.service';
import { TaskQueryService } from '@shared/services/task-query.service';
import { createResourceRequestHandleMock } from '@shared/testing/resource-request-handle.mock';

import { ReportDateCalendarService } from '@report/services/report-date-calendar.service';

import { TasksService } from './tasks.service';

describe('Shared Services tasks.service', () => {
  let service: TasksService;
  const apiRequestService = createResourceRequestHandleMock();
  const errorDialogService = {
    openDialog: vi.fn(() => of(undefined)),
  } as any;
  const reportDateCalendarService = {
    formatJiraSyncDate: vi.fn((date: Date) => date.toISOString().slice(0, 10)),
  };
  const taskQueryService = {
    query: vi.fn(),
  };

  beforeEach(async () => {
    registerLocaleData(localeLv, 'lv-LV');
    apiRequestService.request.mockReset();
    apiRequestService.resource.mockClear();
    apiRequestService.isLoadingSignal.set(false);
    errorDialogService.openDialog.mockReset();
    errorDialogService.openDialog.mockReturnValue(of(undefined));
    reportDateCalendarService.formatJiraSyncDate.mockClear();
    taskQueryService.query.mockReset().mockReturnValue(of([]));
    await TestBed.configureTestingModule({
      providers: [
        { provide: LoaderStateService, useValue: { isLoading: signal(false).asReadonly(), addLoader: vi.fn() } },
        { provide: ApiRequestService, useValue: apiRequestService },
        { provide: ErrorDialogService, useValue: errorDialogService },
        { provide: ReportDateCalendarService, useValue: reportDateCalendarService },
        { provide: TaskQueryService, useValue: taskQueryService },
      ],
    });
    service = TestBed.inject(TasksService);
    vi.clearAllMocks();
  });

  it('lists tasks and maps response', async () => {
    apiRequestService.request.mockReturnValueOnce(of({
      data: [{
        id: '1',
        name: 'Task A',
        timeLogs: [],
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      }],
    }));
    const result = await firstValueFrom(service.list());

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Task);
  });

  it('exposes recent tasks by latest time log descending', async () => {
    apiRequestService.request.mockReturnValueOnce(of({
      data: [
        {
          id: 'older',
          name: 'Older',
          timeLogs: [],
          lastTimeLog: { startTime: '2026-03-01T10:00:00.000Z' },
          tags: [],
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'newer',
          name: 'Newer',
          timeLogs: [],
          lastTimeLog: { startTime: '2026-03-02T10:00:00.000Z' },
          tags: [],
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    }));

    await firstValueFrom(service.list());

    expect(service.recentTasks().map((task: Task) => task.name)).toEqual(['Newer', 'Older']);
  });

  it('loads visible tasks into task state without replacing all tasks for filtered queries', async () => {
    const allTask = new Task({ id: 'all', name: 'All', timeLogs: [], tags: [] } as any);
    const visibleTask = new Task({ id: 'visible', name: 'Visible', timeLogs: [], tags: [] } as any);

    taskQueryService.query.mockReturnValueOnce(of([allTask]));
    await firstValueFrom(service.loadVisibleTasks({}));

    taskQueryService.query.mockReturnValueOnce(of([visibleTask]));
    await firstValueFrom(service.loadVisibleTasks({ name: 'Visible' } as any));

    expect(service.tasks()).toEqual([visibleTask]);
    expect(service.allTasks()).toEqual([allTask]);
  });

  it('taskExist and syncDateToJiraApi return mapped values', async () => {
    apiRequestService.request
      .mockReturnValueOnce(of(undefined))
      .mockReturnValueOnce(of(undefined));

    await expect(firstValueFrom(service.taskExist('abc'))).resolves.toBeNull();
    await expect(firstValueFrom(service.syncDateToJiraApi(new Task({ id: '1' } as any), new Date('2024-01-01T00:00:00.000Z')))).resolves.toBe(true);
  });

  it('taskExist does not open error dialog for duplicate-name conflicts', async () => {
    apiRequestService.request.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );

    await expect(firstValueFrom(service.taskExist('duplicate-name'))).rejects.toMatchObject({ status: 409 });
    expect(errorDialogService.openDialog).not.toHaveBeenCalled();
  });

  it('taskExist also suppresses dialog for plain 409 error objects', async () => {
    apiRequestService.request.mockReturnValueOnce(
      throwError(() => ({ status: 409 })),
    );

    await expect(firstValueFrom(service.taskExist('duplicate-name'))).rejects.toMatchObject({ status: 409 });
    expect(errorDialogService.openDialog).not.toHaveBeenCalled();
  });

  it('create/update/delete trigger expected request flow', async () => {
    apiRequestService.request
      .mockReturnValueOnce(of({}))
      .mockReturnValueOnce(of({ data: [{ id: '1', name: 'T', timeLogs: [], tags: [], createdAt: '2024-01-01T00:00:00.000Z' }] }))
      .mockReturnValueOnce(of({}))
      .mockReturnValueOnce(of({ data: [{ id: '1', name: 'T', timeLogs: [], tags: [], createdAt: '2024-01-01T00:00:00.000Z' }] }))
      .mockReturnValueOnce(of(undefined))
      .mockReturnValueOnce(of({ data: [] }));

    const task = new Task({ id: '1', name: 'T', tags: [], timeLogs: [] } as any);

    await firstValueFrom(service.create(task));
    await firstValueFrom(service.update(task));
    await firstValueFrom(service.delete(task));

    expect(apiRequestService.request).toHaveBeenCalled();
  });

  it('list handles 404 by returning []', async () => {
    apiRequestService.request.mockReturnValueOnce(throwError(() => ({ status: 404 })));
    await expect(firstValueFrom(service.list())).resolves.toEqual([]);
  });

  it('create reports error through ErrorDialogService when request fails', async () => {
    apiRequestService.request.mockReturnValueOnce(throwError(() => new Error('create-fail')));
    const task = new Task({ id: '1', name: 'T', tags: [], timeLogs: [] } as any);

    await expect(firstValueFrom(service.create(task))).rejects.toThrow('create-fail');
    expect(errorDialogService.openDialog).toHaveBeenCalledTimes(1);
  });

  it('reuses the cached error-dialog service promise', async () => {
    const first = (service as any)['loadErrorDialogService']();
    const second = (service as any)['loadErrorDialogService']();

    const [firstService, secondService] = await Promise.all([first, second]);
    expect(firstService).toBe(secondService);
    expect(firstService).toBe(errorDialogService);
  });
});
