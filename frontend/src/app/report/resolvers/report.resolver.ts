import { inject } from '@angular/core';
import { ParamMap, RedirectCommand, type ResolveFn, Router } from '@angular/router';

import { ReportService } from '@report/services/report.service';

export const reportResolver: ResolveFn<boolean | RedirectCommand> = (route): boolean | RedirectCommand => {
  const router: Router = inject(Router);
  const reportService: ReportService = inject(ReportService);
  const paramMap: ParamMap = route.paramMap;
  const result: { shouldRedirect: boolean } = reportService.applyRouteParams(paramMap);

  if (result.shouldRedirect) {
    return new RedirectCommand(router.parseUrl('/report'));
  }

  return true;
};
