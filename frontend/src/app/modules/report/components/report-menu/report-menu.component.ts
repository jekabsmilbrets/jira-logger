import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';

import { Tag } from '@shared/models/tag.model';

import { map, Observable } from 'rxjs';

@Component(
  {
    selector: 'report-menu',
    templateUrl: './report-menu.component.html',
    styleUrls: ['./report-menu.component.scss'],
    standalone: false,
  },
)
export class ReportMenuComponent {
  public reportMode$: Observable<ReportModeEnum>;
  public tags$: Observable<Tag[]>;
  public date$: Observable<Date | null>;
  public startDate$: Observable<Date | null>;
  public endDate$: Observable<Date | null>;
  public showWeekends$: Observable<boolean>;
  public hideUnreportedTasks$: Observable<boolean>;
  public isSmallerThanDesktop$: Observable<boolean>;

  private readonly smallerThanDesktopBreakpoint = '(max-width: 1300px)';

  @ViewChild('smallScreenDialog')
  private dialogTemplate!: TemplateRef<any>;

  constructor(
    private readonly dialog: MatDialog,
    private reportService: ReportService,
    private observer: BreakpointObserver,
  ) {
    this.reportMode$ = this.reportService.reportMode$;
    this.tags$ = this.reportService.tags$;
    this.date$ = this.reportService.date$;
    this.startDate$ = this.reportService.startDate$;
    this.endDate$ = this.reportService.endDate$;
    this.showWeekends$ = this.reportService.showWeekends$;
    this.hideUnreportedTasks$ = this.reportService.hideUnreportedTasks$;
    this.isSmallerThanDesktop$ = this.observer.observe(
      this.smallerThanDesktopBreakpoint,
    )
      .pipe(
        map(
          (results: BreakpointState) => (
            results.matches &&
            results.breakpoints[this.smallerThanDesktopBreakpoint]
          ),
        ),
      );
  }

  public onReportModeChange(value: ReportModeEnum): void {
    this.reportService.reportMode = value;
  }

  public onTagChange(value: Tag[]): void {
    this.reportService.tags = value;
  }

  public onDateChange(date: Date | null): void {
    this.reportService.date = date;
  }

  public onStartDateChange(date: Date | null): void {
    this.reportService.startDate = date;
  }

  public onEndDateChange(date: Date | null): void {
    this.reportService.endDate = date;
  }

  public onShowWeekendsChange(showWeekends: boolean): void {
    this.reportService.showWeekends = showWeekends;
  }

  public onHideUnreportedTasksChange(hideUnreportedTasks: boolean): void {
    this.reportService.hideUnreportedTasks = hideUnreportedTasks;
  }

  public onSmallScreenMenuToggle(): void {
    this.dialog.open(this.dialogTemplate);
  }

  public showDatePicker(): Observable<boolean> {
    return this.reportMode$
      .pipe(
        map(
          (reportMode: ReportModeEnum) => [
            'dateRange',
            'date',
          ].includes(reportMode),
        ),
      );
  }
}
