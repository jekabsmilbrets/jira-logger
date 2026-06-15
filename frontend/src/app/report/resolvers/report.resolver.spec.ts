import { TestBed } from '@angular/core/testing';
import { convertToParamMap, RedirectCommand, Router } from '@angular/router';

import { firstValueFrom, isObservable } from 'rxjs';

import { ReportMode } from '@report/enums/report-mode.enum';
import { reportResolver } from '@report/resolvers/report.resolver';
import { ReportService } from '@report/services/report.service';
import { ReportServiceStub } from '@report/testing/report-service.stub';

describe('reportResolver', () => {
  let router: { parseUrl: ReturnType<typeof vi.fn> };
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
    router = {
      parseUrl: vi.fn().mockReturnValue('/report'),
    };
    reportService = new ReportServiceStub();

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: ReportService, useValue: reportService },
      ],
    });
  });

  it('returns true when no relevant route params are present', async () => {
    const result = await runResolver({});

    expect(result).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('sets report mode from a valid reportMode param', async () => {
    const result = await runResolver({ reportMode: ReportMode.date });

    expect(result).toBe(true);
    expect(reportService.reportMode()).toBe(ReportMode.date);
  });

  it('falls back to total mode for an invalid reportMode param', async () => {
    reportService.setReportMode(ReportMode.dateRange);

    const result = await runResolver({ reportMode: 'invalid-mode' });

    expect(result).toBe(true);
    expect(reportService.reportMode()).toBe(ReportMode.total);
  });

  it('navigates to /report and returns false for a valid date param', async () => {
    const result = await runResolver({ date: '2026-05-30T12:00:00.000Z' });

    expect(result).toBeInstanceOf(RedirectCommand);
    expect(router.parseUrl).toHaveBeenCalledWith('/report');
    expect(reportService.date()).toBeInstanceOf(Date);
    expect(reportService.date()?.toISOString()).toBe('2026-05-30T12:00:00.000Z');
  });

  it('returns true and does not navigate for an invalid date param', async () => {
    const result = await runResolver({ date: 'not-a-date' });

    expect(result).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });
});
