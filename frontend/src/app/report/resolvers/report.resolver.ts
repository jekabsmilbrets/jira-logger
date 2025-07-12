import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, ParamMap, Router, RouterStateSnapshot } from '@angular/router';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';

import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ReportResolver {
  private readonly router: Router = inject(Router);
  private readonly reportService: ReportService = inject(ReportService);

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean> {
    const paramMap: ParamMap = route.paramMap;

    if (paramMap.has('reportMode')) {
      const reportMode: ReportModeEnum = paramMap.get('reportMode') as ReportModeEnum;

      if (reportMode in ReportModeEnum) {
        this.reportService.reportMode = reportMode;
      } else {
        this.reportService.reportMode = ReportModeEnum.total;
      }
    }

    if (paramMap.has('date')) {
      const date: Date = new Date(paramMap.get('date') as string);

      if (isFinite(+date)) {
        this.router.navigate(['report'])
          .then(() => this.reportService.date = date);

        return of(false);
      }
    }

    return of(true);
  }
}
