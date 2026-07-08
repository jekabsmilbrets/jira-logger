import { inject } from '@angular/core';
import { type ResolveFn } from '@angular/router';

import { map, type Observable, take } from 'rxjs';

import { TasksService } from '@shared/services/tasks.service';

import type { ReportRouteSettings } from '@report/interfaces/report-route-settings.interface';
import { ReportService } from '@report/services/report.service';

export const reportResolver: ResolveFn<boolean> = (route): Observable<boolean> => {
  const reportService: ReportService = inject(ReportService);
  const tasksService: TasksService = inject(TasksService);
  const routeSettings: ReportRouteSettings = {
    reportMode: route.paramMap.get('reportMode'),
    date: route.paramMap.get('date'),
  };

  reportService.applySettingsChange({
    type: 'route-settings',
    routeSettings,
  });

  return tasksService.loadVisibleTasks({})
    .pipe(
      take(1),
      map(() => true),
    );
};
