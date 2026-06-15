import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, ParamMap, Router } from '@angular/router';

import { Observable, of } from 'rxjs';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';

@Injectable({
  providedIn: 'root',
})
export class ReportResolver {
  private readonly router: Router = inject(Router);
  private readonly reportService: ReportService = inject(ReportService);

  resolve(
    route: ActivatedRouteSnapshot,
  ): Observable<boolean> {
    const paramMap: ParamMap = route.paramMap;

    if (paramMap.has('reportMode')) {
      const reportMode: ReportModeEnum = paramMap.get('reportMode') as ReportModeEnum;

      if (reportMode in ReportModeEnum) {
        this.reportService.setReportMode(reportMode);
      } else {
        this.reportService.setReportMode(ReportModeEnum.total);
      }
    }

    if (paramMap.has('date')) {
      const date: Date = new Date(paramMap.get('date') as string);

      if (isFinite(+date)) {
        this.router.navigate(['report'])
          .then(() => this.reportService.setDate(date));

        return of(false);
      }
    }

    return of(true);
  }
}
