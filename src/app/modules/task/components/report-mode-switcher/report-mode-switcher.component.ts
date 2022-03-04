import { Component, OnDestroy } from '@angular/core';
import { FormControl }          from '@angular/forms';

import { Subscription } from 'rxjs';

import { ReportModeEnum } from '@task/enums/report-mode.enum';
import { ReportService }  from '@task/services/report.service';

@Component({
             selector: 'app-report-mode-switcher',
             templateUrl: './report-mode-switcher.component.html',
             styleUrls: ['./report-mode-switcher.component.scss'],
           })
export class ReportModeSwitcherComponent implements OnDestroy {
  public reportModes: {
    value: ReportModeEnum;
    viewValue: string;
  }[] = [
    {
      value: ReportModeEnum.total,
      viewValue: 'Total',
    },
    {
      value: ReportModeEnum.month,
      viewValue: 'Month',
    },
  ];

  public reportModeFormControl: FormControl = new FormControl(ReportModeEnum.total);
  private subscriptions: Subscription[] = [];

  constructor(
    private reportService: ReportService,
  ) {
    this.subscriptions.push(
      this.listenToReportModeChange(),
    );
    this.subscriptions.push(
      this.reportService.reportMode$
          .subscribe(
            (reportMode: ReportModeEnum) => this.reportModeFormControl.setValue(
              reportMode,
              {emitEvent: false},
            ),
          ),
    );
  }

  public ngOnDestroy(): void {
    this.subscriptions.forEach((sub: Subscription) => sub.unsubscribe());
  }

  private listenToReportModeChange(): Subscription {
    return this.reportModeFormControl
               .valueChanges
               .subscribe(
                 (value: ReportModeEnum) => this.reportService.reportMode = value,
               );
  }
}
