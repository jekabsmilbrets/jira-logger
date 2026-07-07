import { inject } from '@angular/core';
import { ParamMap, type ResolveFn } from '@angular/router';

import { map, type Observable, take } from 'rxjs';

import { TasksService } from '@shared/services/tasks.service';

import { ReportService } from '@report/services/report.service';

export const reportResolver: ResolveFn<boolean> = (route): Observable<boolean> => {
  const reportService: ReportService = inject(ReportService);
  const tasksService: TasksService = inject(TasksService);
  const paramMap: ParamMap = route.paramMap;
  reportService.applySettingsChange({
    type: 'route',
    paramMap,
  });

  return tasksService.loadVisibleTasks({})
    .pipe(
      take(1),
      map(() => true),
    );
};
