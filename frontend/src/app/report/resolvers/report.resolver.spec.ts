import { TestBed } from '@angular/core/testing';
import { convertToParamMap, Router } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportResolver } from '@report/resolvers/report.resolver';
import { ReportService } from '@report/services/report.service';

class ReportServiceStub {
  public reportMode: ReportModeEnum = ReportModeEnum.total;
  public date: Date | null = null;

  public setReportMode(mode: ReportModeEnum): void {
    this.reportMode = mode;
  }

  public setDate(date: Date | null): void {
    this.date = date;
  }
}

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

    TestBed.configureTestingModule({
      providers: [
        ReportResolver,
        { provide: Router, useValue: router },
        { provide: ReportService, useClass: ReportServiceStub },
      ],
    });

    resolver = TestBed.inject(ReportResolver);
    reportService = TestBed.inject(ReportService) as unknown as ReportServiceStub;
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
      resolver.resolve(createRoute({ reportMode: ReportModeEnum.date }) as never),
    );

    expect(result).toBe(true);
    expect(reportService.reportMode).toBe(ReportModeEnum.date);
  });

  it('falls back to total mode for an invalid reportMode param', async () => {
    reportService.setReportMode(ReportModeEnum.dateRange);

    const result = await firstValueFrom(
      resolver.resolve(createRoute({ reportMode: 'invalid-mode' }) as never),
    );

    expect(result).toBe(true);
    expect(reportService.reportMode).toBe(ReportModeEnum.total);
  });

  it('navigates to /report and returns false for a valid date param', async () => {
    const result = await firstValueFrom(
      resolver.resolve(createRoute({ date: '2026-05-30T12:00:00.000Z' }) as never),
    );

    await Promise.resolve();

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['report']);
    expect(reportService.date).toBeInstanceOf(Date);
    expect((reportService.date as Date).toISOString()).toBe('2026-05-30T12:00:00.000Z');
  });

  it('returns true and does not navigate for an invalid date param', async () => {
    const result = await firstValueFrom(
      resolver.resolve(createRoute({ date: 'not-a-date' }) as never),
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
