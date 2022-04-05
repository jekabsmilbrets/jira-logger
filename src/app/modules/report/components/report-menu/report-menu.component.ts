import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Component, ViewChild, TemplateRef }   from '@angular/core';
import { MatDialog }                           from '@angular/material/dialog';

import { Observable, map } from 'rxjs';

import { TaskTagsEnum } from '@task/enums/task-tags.enum';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportService }  from '@report/services/report.service';

@Component({
             selector: 'app-report-menu',
             templateUrl: './report-menu.component.html',
             styleUrls: ['./report-menu.component.scss'],
           })
export class ReportMenuComponent {
  public reportMode$: Observable<ReportModeEnum>;
  public tags$: Observable<TaskTagsEnum[]>;
  public startDate$: Observable<Date>;
  public endDate$: Observable<Date>;
  public showWeekends$: Observable<boolean>;
  public isSmallerThanDesktop$: Observable<boolean>;

  private readonly smallerThanDesktopBreakpoint = '(max-width: 1023px)';

  @ViewChild('smallScreenDialog')
  private dialogTemplate!: TemplateRef<any>;

  constructor(
    private readonly dialog: MatDialog,
    private reportService: ReportService,
    private observer: BreakpointObserver,
  ) {
    this.reportMode$ = this.reportService.reportMode$;
    this.tags$ = this.reportService.tags$;
    this.startDate$ = this.reportService.startDate$;
    this.endDate$ = this.reportService.endDate$;
    this.showWeekends$ = this.reportService.showWeekends$;
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

  public onTagChange(value: TaskTagsEnum[]): void {
    this.reportService.tags = value;
  }

  public onStartDateChange(date: Date): void {
    this.reportService.startDate = date;
  }

  public onEndDateChange(date: Date): void {
    this.reportService.endDate = date;
  }

  public onShowWeekendsChange(showWeekends: boolean): void {
    this.reportService.showWeekends = showWeekends;
  }

  public onSmallScreenMenuToggle(): void {
    this.dialog.open(this.dialogTemplate);
  }
}
