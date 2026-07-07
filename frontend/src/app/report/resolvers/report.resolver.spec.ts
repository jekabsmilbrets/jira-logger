import { TestBed } from '@angular/core/testing';
import { convertToParamMap } from '@angular/router';

import { firstValueFrom, isObservable } from 'rxjs';

import { reportResolver } from '@report/resolvers/report.resolver';
import { ReportService } from '@report/services/report.service';
import { ReportServiceStub } from '@report/testing/report-service.stub';

describe('reportResolver', () => {
  let reportService: ReportServiceStub;

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

    TestBed.configureTestingModule({
      providers: [
        { provide: ReportService, useValue: reportService },
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
      type: 'route',
      paramMap: expect.any(Object),
    });
    const change = reportService.applySettingsChange.mock.calls[0][0];
    expect(change.paramMap.get('date')).toBe(params.date);
    expect(change.paramMap.get('reportMode')).toBe(params.reportMode);
  });
});
