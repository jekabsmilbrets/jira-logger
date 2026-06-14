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

import { TasksService } from './tasks.service';

describe('Shared Services tasks.service', () => {
  let service: TasksService;
  const apiRequestService = {
    buildApiUrl: vi.fn((base: string, suffix = '') => `https://api/${ base }${ suffix }`),
    request: vi.fn(),
  } as any;
  const errorDialogService = {
    openDialog: vi.fn(() => of(undefined)),
  } as any;

  beforeEach(async () => {
    registerLocaleData(localeLv, 'lv-LV');
    apiRequestService.request.mockReset();
    apiRequestService.buildApiUrl.mockClear();
    errorDialogService.openDialog.mockReset();
    errorDialogService.openDialog.mockReturnValue(of(undefined));
    await TestBed.configureTestingModule({
      providers: [
        { provide: LoaderStateService, useValue: { isLoading: signal(false).asReadonly(), addLoader: vi.fn() } },
        { provide: ApiRequestService, useValue: apiRequestService },
        { provide: ErrorDialogService, useValue: errorDialogService },
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

  it('filteredList builds query and updates list when requested', async () => {
    apiRequestService.request.mockReturnValueOnce(of({ data: [] }));
    const result = await firstValueFrom(service.filteredList({ hideUnreported: true, name: 'abc' } as any, true));

    expect(result).toEqual([]);
    expect(apiRequestService.request).toHaveBeenCalled();
  });

  it('filteredList builds full query params for all supported filters', async () => {
    apiRequestService.request.mockReturnValueOnce(of({ data: [] }));
    const date = new Date(2024, 0, 1, 10, 0, 0);
    const startDate = new Date(2024, 0, 2, 10, 0, 0);
    const endDate = new Date(2024, 0, 3, 10, 0, 0);

    await firstValueFrom(service.filteredList({
      hideUnreported: true,
      name: 'abc',
      tags: ['t1', 't2'],
      date,
      startDate,
      endDate,
    } as any, true));

    const calledUrl = apiRequestService.buildApiUrl.mock.calls.at(-1)?.[1] as string;
    expect(calledUrl).toContain('hideUnreported=true');
    expect(calledUrl).toContain('name=abc');
    expect(calledUrl).toContain('tags=t1,t2');
    expect(calledUrl).toContain('date=2024-01-01');
    expect(calledUrl).toContain('startDate=2024-01-02');
    expect(calledUrl).toContain('endDate=2024-01-03');
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

  it('filteredList handles 404 by returning []', async () => {
    apiRequestService.request.mockReturnValueOnce(throwError(() => ({ status: 404 })));
    await expect(firstValueFrom(service.filteredList({} as any, false))).resolves.toEqual([]);
  });

  it('create reports error through ErrorDialogService when request fails', async () => {
    apiRequestService.request.mockReturnValueOnce(throwError(() => new Error('create-fail')));
    const task = new Task({ id: '1', name: 'T', tags: [], timeLogs: [] } as any);

    await expect(firstValueFrom(service.create(task))).rejects.toThrow('create-fail');
    expect(errorDialogService.openDialog).toHaveBeenCalledTimes(1);
  });
});
