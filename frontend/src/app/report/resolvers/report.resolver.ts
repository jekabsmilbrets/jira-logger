import { inject } from '@angular/core';
import { ParamMap, type ResolveFn } from '@angular/router';

import { ReportService } from '@report/services/report.service';

export const reportResolver: ResolveFn<boolean> = (route): boolean => {
  const reportService: ReportService = inject(ReportService);
  const paramMap: ParamMap = route.paramMap;
  reportService.applySettingsChange({
    type: 'route',
    paramMap,
  });

  return true;
};
