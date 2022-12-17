import { Injectable }                                                   from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot } from '@angular/router';

import { Observable, of } from 'rxjs';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportService }  from '@report/services/report.service';


@Injectable()
export class ReportResolver implements Resolve<boolean> {
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
      date?.setHours(0,0,0,0);

      this.reportService.date = date;

      this.router.navigate(['report']);

      return of(false);
    }

    return of(true);
  }
}
