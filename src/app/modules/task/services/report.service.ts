import { Injectable } from '@angular/core';

import { BehaviorSubject, Observable } from 'rxjs';

import { ReportModeEnum } from '@task/enums/report-mode.enum';

@Injectable()
export class ReportService {
  public reportMode$: Observable<ReportModeEnum>;

  private reportModeSubject: BehaviorSubject<ReportModeEnum> = new BehaviorSubject<ReportModeEnum>(ReportModeEnum.total);

  constructor() {
    this.reportMode$ = this.reportModeSubject.asObservable();
  }

  public set reportMode(mode: ReportModeEnum) {
    this.reportModeSubject.next(mode);
  }
}
