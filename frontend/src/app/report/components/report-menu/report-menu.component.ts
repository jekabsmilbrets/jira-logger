import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, inject, Signal, TemplateRef, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ReportModeEnum } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';
import { ReportDateSelectorComponent } from '@shared/components/report-menu/report-date-selector/report-date-selector.component';
import { ReportHideUnreportedTasksComponent } from '@shared/components/report-menu/report-hide-unreported-tasks/report-hide-unreported-tasks.component';
import { ReportModeSwitcherComponent } from '@shared/components/report-menu/report-mode-switcher/report-mode-switcher.component';
import { ReportShowWeekendsComponent } from '@shared/components/report-menu/report-show-weekends/report-show-weekends.component';
import { ReportTagFilterComponent } from '@shared/components/report-menu/report-tag-filter/report-tag-filter.component';

import { Tag } from '@shared/models/tag.model';

import { map, Observable } from 'rxjs';

@Component({
  selector: 'report-menu',
  templateUrl: './report-menu.component.html',
  styleUrls: ['./report-menu.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReportTagFilterComponent,
    ReportModeSwitcherComponent,
    ReportDateSelectorComponent,
    ReportShowWeekendsComponent,
    ReportHideUnreportedTasksComponent,
    MatIconModule,
    MatButtonModule,
  ],
})
export class ReportMenuComponent {
  protected reportMode$: Observable<ReportModeEnum>;
  protected tags$: Observable<Tag[]>;
  protected date$: Observable<Date | null>;
  protected startDate$: Observable<Date | null>;
  protected endDate$: Observable<Date | null>;
  protected showWeekends$: Observable<boolean>;
  protected hideUnreportedTasks$: Observable<boolean>;
  protected isSmallerThanDesktop$: Observable<boolean>;

  protected ReportModeEnum = ReportModeEnum;

  private readonly matDialog: MatDialog = inject(MatDialog);
  private readonly reportService: ReportService = inject(ReportService);
  private readonly breakpointObserver: BreakpointObserver = inject(BreakpointObserver);

  private readonly smallerThanDesktopBreakpoint: string = '(max-width: 1300px)';

  private readonly dialogTemplate: Signal<TemplateRef<HTMLDivElement>> = viewChild.required<TemplateRef<HTMLDivElement>>('smallScreenDialog');

  constructor() {
    this.reportMode$ = this.reportService.reportMode$;
    this.tags$ = this.reportService.tags$;
    this.date$ = this.reportService.date$;
    this.startDate$ = this.reportService.startDate$;
    this.endDate$ = this.reportService.endDate$;
    this.showWeekends$ = this.reportService.showWeekends$;
    this.hideUnreportedTasks$ = this.reportService.hideUnreportedTasks$;
    this.isSmallerThanDesktop$ = this.breakpointObserver.observe(this.smallerThanDesktopBreakpoint)
      .pipe(
        map(
          (results: BreakpointState) => results.matches && results.breakpoints[this.smallerThanDesktopBreakpoint],
        ),
      );
  }

  protected onReportModeChange(
    value: ReportModeEnum,
  ): void {
    this.reportService.reportMode = value;
  }

  protected onTagChange(
    value: Tag[],
  ): void {
    this.reportService.tags = value;
  }

  protected onDateChange(
    date: Date | null,
  ): void {
    this.reportService.date = date;
  }

  protected onStartDateChange(
    date: Date | null,
  ): void {
    this.reportService.startDate = date;
  }

  protected onEndDateChange(
    date: Date | null,
  ): void {
    this.reportService.endDate = date;
  }

  protected onShowWeekendsChange(
    showWeekends: boolean,
  ): void {
    this.reportService.showWeekends = showWeekends;
  }

  protected onHideUnreportedTasksChange(
    hideUnreportedTasks: boolean,
  ): void {
    this.reportService.hideUnreportedTasks = hideUnreportedTasks;
  }

  protected onSmallScreenMenuToggle(): void {
    this.matDialog.open(
      this.dialogTemplate(),
    );
  }

  protected showDatePicker(): Observable<boolean> {
    return this.reportMode$.pipe(
      map(
        (reportMode: ReportModeEnum) => ['dateRange', 'date'].includes(reportMode),
      ),
    );
  }
}
