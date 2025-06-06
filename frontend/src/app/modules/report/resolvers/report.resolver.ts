import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';

import { Observable, of } from 'rxjs';

@Injectable()
export class ReportResolver {
  constructor(
    private router: Router,
    private reportService: ReportService,
  ) {
  }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    const paramMap = route.paramMap;

    if (paramMap.has('reportMode')) {
      const reportMode = paramMap.get('reportMode') as string;

      if (reportMode in ReportModeEnum) {
        this.reportService.reportMode = ReportModeEnum[reportMode as keyof typeof ReportModeEnum];
      } else {
        this.reportService.reportMode = ReportModeEnum.total;
      }
    }

    if (paramMap.has('date')) {
      const date = new Date(paramMap.get('date') as string);

      if (isFinite(+date)) {
        this.router.navigate(['report']);
        setTimeout(() => this.reportService.date = date, 100); // TODO: FIX HAX

        return of(false);
      }
    }

    return of(true);
  }
}
