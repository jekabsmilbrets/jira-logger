import { TestBed } from '@angular/core/testing';
import { convertToParamMap, Router } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { ReportMode } from '@report/enums/report-mode.enum';
import { ReportResolver } from '@report/resolvers/report.resolver';
import { ReportService } from '@report/services/report.service';
import { ReportServiceStub } from '@report/testing/report-service.stub';

describe('ReportResolver', () => {
  let resolver: ReportResolver;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let reportService: ReportServiceStub;

  const createRoute = (params: Record<string, string>) => ({
    paramMap: convertToParamMap(params),
  });

  beforeEach(() => {
    router = {
      navigate: vi.fn().mockResolvedValue(true),
    };
    reportService = new ReportServiceStub();

    TestBed.configureTestingModule({
      providers: [
        ReportResolver,
        { provide: Router, useValue: router },
        { provide: ReportService, useValue: reportService },
      ],
    });

    resolver = TestBed.inject(ReportResolver);
  });

  it('returns true when no relevant route params are present', async () => {
    const result = await firstValueFrom(
      resolver.resolve(createRoute({}) as never),
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('sets report mode from a valid reportMode param', async () => {
    const result = await firstValueFrom(
      resolver.resolve(createRoute({ reportMode: ReportMode.date }) as never),
    );

    expect(result).toBe(true);
    expect(reportService.reportMode()).toBe(ReportMode.date);
  });

  it('falls back to total mode for an invalid reportMode param', async () => {
    reportService.setReportMode(ReportMode.dateRange);

    const result = await firstValueFrom(
      resolver.resolve(createRoute({ reportMode: 'invalid-mode' }) as never),
    );

    expect(result).toBe(true);
    expect(reportService.reportMode()).toBe(ReportMode.total);
  });

  it('navigates to /report and returns false for a valid date param', async () => {
    const result = await firstValueFrom(
      resolver.resolve(createRoute({ date: '2026-05-30T12:00:00.000Z' }) as never),
    );

    await Promise.resolve();

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['report']);
    expect(reportService.date()).toBeInstanceOf(Date);
    expect(reportService.date()?.toISOString()).toBe('2026-05-30T12:00:00.000Z');
  });

  it('returns true and does not navigate for an invalid date param', async () => {
    const result = await firstValueFrom(
      resolver.resolve(createRoute({ date: 'not-a-date' }) as never),
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
