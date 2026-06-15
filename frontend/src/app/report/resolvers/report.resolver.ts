import { inject } from '@angular/core';
import { ParamMap, RedirectCommand, type ResolveFn, Router } from '@angular/router';

import { ReportMode } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';

export const reportResolver: ResolveFn<boolean | RedirectCommand> = (route): boolean | RedirectCommand => {
  const router: Router = inject(Router);
  const reportService: ReportService = inject(ReportService);
  const paramMap: ParamMap = route.paramMap;

  if (paramMap.has('reportMode')) {
    const reportMode: ReportMode = paramMap.get('reportMode') as ReportMode;

    if (reportMode in ReportMode) {
      reportService.setReportMode(reportMode);
    } else {
      reportService.setReportMode(ReportMode.total);
    }
  }

  if (paramMap.has('date')) {
    const date: Date = new Date(paramMap.get('date') as string);

    if (isFinite(+date)) {
      reportService.setDate(date);

      return new RedirectCommand(router.parseUrl('/report'));
    }
  }

  return true;
};
