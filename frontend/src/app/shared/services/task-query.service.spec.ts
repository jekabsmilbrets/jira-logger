import { registerLocaleData } from '@angular/common';
import localeLv from '@angular/common/locales/lv';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom, of, throwError } from 'rxjs';

import { TimezoneService } from '@core/services/timezone.service';

import { Task } from '@shared/models/task.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import { TaskQueryService } from '@shared/services/task-query.service';
import { createResourceRequestHandleMock } from '@shared/testing/resource-request-handle.mock';

describe('Shared Services TaskQueryService', () => {
  let service: TaskQueryService;
  const apiRequestService = createResourceRequestHandleMock();

  beforeEach(async () => {
    registerLocaleData(localeLv, 'lv-LV');
    apiRequestService.request.mockReset();
    apiRequestService.resource.mockClear();

    await TestBed.configureTestingModule({
      providers: [
        TaskQueryService,
        { provide: ApiRequestService, useValue: apiRequestService },
        { provide: TimezoneService, useValue: { timezone: 'UTC' } },
      ],
    });

    service = TestBed.inject(TaskQueryService);
    vi.clearAllMocks();
  });

  it('queries tasks and maps response models', async () => {
    apiRequestService.request.mockReturnValueOnce(of({
      data: [{
        id: '1',
        name: 'Task A',
        timeLogs: [],
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      }],
    }));

    const result = await firstValueFrom(service.query({}));

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Task);
  });

  it('builds query params for every supported task filter', async () => {
    apiRequestService.request.mockReturnValueOnce(of({ data: [] }));
    const date = new Date(2024, 0, 1, 10, 0, 0);
    const startDate = new Date(2024, 0, 2, 10, 0, 0);
    const endDate = new Date(2024, 0, 3, 10, 0, 0);

    await firstValueFrom(service.query({
      hideUnreported: true,
      name: 'abc',
      tags: ['t1', 't2'],
      date,
      startDate,
      endDate,
    }));

    const calledUrl = apiRequestService.request.mock.calls.at(-1)?.[0] as string;
    expect(calledUrl).toContain('hideUnreported=true');
    expect(calledUrl).toContain('name=abc');
    expect(calledUrl).toContain('tags=t1,t2');
    expect(calledUrl).toContain('date=2024-01-01');
    expect(calledUrl).toContain('startDate=2024-01-02');
    expect(calledUrl).toContain('endDate=2024-01-03');
  });

  it('uses the bare task resource for an empty filter', async () => {
    apiRequestService.request.mockReturnValueOnce(of({ data: [] }));

    await firstValueFrom(service.query({}));

    expect(apiRequestService.request.mock.calls.at(-1)?.[0]).toBe('https://api/task');
  });

  it('returns an empty list for missing filtered tasks', async () => {
    apiRequestService.request.mockReturnValueOnce(throwError(() => ({ status: 404 })));

    await expect(firstValueFrom(service.query({ name: 'missing' }))).resolves.toEqual([]);
  });
});
