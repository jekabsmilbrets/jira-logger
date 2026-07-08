import { inject } from '@angular/core';
import { type ResolveFn } from '@angular/router';

import { map, type Observable, take } from 'rxjs';

import { TasksService } from '@shared/services/tasks.service';

import { ReportService, type ReportRouteSettings } from '@report/services/report.service';

export const reportResolver: ResolveFn<boolean> = (route): Observable<boolean> => {
  const reportService: ReportService = inject(ReportService);
  const tasksService: TasksService = inject(TasksService);
  const routeSettings: ReportRouteSettings = {
    reportMode: route.paramMap.get('reportMode'),
    date: route.paramMap.get('date'),
  };

  reportService.applyRouteSettings(routeSettings);

  return tasksService.loadVisibleTasks({})
    .pipe(
      take(1),
      map(() => true),
    );
};
