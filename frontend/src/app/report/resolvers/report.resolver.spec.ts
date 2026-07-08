import { TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';

import { firstValueFrom, isObservable, of } from 'rxjs';

import { TasksService } from '@shared/services/tasks.service';

import { reportResolver } from '@report/resolvers/report.resolver';
import { ReportService } from '@report/services/report.service';
import { ReportServiceStub } from '@report/testing/report-service.stub';

describe('reportResolver', () => {
  let reportService: ReportServiceStub;
  const tasksService = {
    loadVisibleTasks: vi.fn(),
  };

  const createRoute = (params: Record<string, string>) => ({
    paramMap: convertToParamMap(params),
  });
  const runResolver = async (params: Record<string, string>) => {
    const result = TestBed.runInInjectionContext(() => reportResolver(createRoute(params) as never, {} as never));

    if (isObservable(result)) {
      return firstValueFrom(result);
    }

    return Promise.resolve(result);
  };

  beforeEach(() => {
    reportService = new ReportServiceStub();
    tasksService.loadVisibleTasks.mockReset();
    tasksService.loadVisibleTasks.mockReturnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        { provide: ReportService, useValue: reportService },
        { provide: TasksService, useValue: tasksService },
      ],
    });
  });

  it('returns true when no relevant route params are present', async () => {
    const result = await runResolver({});

    expect(result).toBe(true);
  });

  it('applies route params through ReportService', async () => {
    const params = {
      reportMode: 'date',
      date: '2026-05-30',
    };

    const result = await runResolver(params);

    expect(result).toBe(true);
    expect(reportService.applySettingsChange).toHaveBeenCalledOnce();
    expect(reportService.applySettingsChange).toHaveBeenCalledWith({
      type: 'route-settings',
      routeSettings: {
        reportMode: params.reportMode,
        date: params.date,
      },
    });
    expect(tasksService.loadVisibleTasks).toHaveBeenCalledWith({});
  });
});
