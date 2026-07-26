import { inject } from '@angular/core';
import { type ResolveFn } from '@angular/router';

import type { ReportRouteSettings } from '@report/interfaces/report-route-settings.interface';
import { Report } from '@report/services/report';

export const report: ResolveFn<boolean> = (route): boolean => {
  const reportService: Report = inject(Report);
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
