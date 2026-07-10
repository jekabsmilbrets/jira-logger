import { inject } from '@angular/core';
import { type ResolveFn } from '@angular/router';

import type { ReportRouteSettings } from '@report/interfaces/report-route-settings.interface';
import { ReportService } from '@report/services/report.service';

export const reportResolver: ResolveFn<boolean> = (route): boolean => {
  const reportService: ReportService = inject(ReportService);
  const routeSettings: ReportRouteSettings = {
    reportMode: route.paramMap.get('reportMode'),
    date: route.paramMap.get('date'),
  };

  reportService.applySettingsChange({
    type: 'route-settings',
    routeSettings,
  });

  return true;
};
