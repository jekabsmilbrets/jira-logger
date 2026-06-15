import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Signal, TemplateRef, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { map } from 'rxjs';

import { ReportDateSelectorComponent } from '@shared/components/report-menu/report-date-selector/report-date-selector.component';
import { ReportHideUnreportedTasksComponent } from '@shared/components/report-menu/report-hide-unreported-tasks/report-hide-unreported-tasks.component';
import { ReportModeSwitcherComponent } from '@shared/components/report-menu/report-mode-switcher/report-mode-switcher.component';
import { ReportShowWeekendsComponent } from '@shared/components/report-menu/report-show-weekends/report-show-weekends.component';
import { ReportTagFilterComponent } from '@shared/components/report-menu/report-tag-filter/report-tag-filter.component';
import { Tag } from '@shared/models/tag.model';

import { ReportMode } from '@report/enums/report-mode.enum';
import { ReportService } from '@report/services/report.service';

@Component({
  selector: 'report-menu',
  templateUrl: './report-menu.component.html',
  styleUrls: ['./report-menu.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReportTagFilterComponent,
    ReportModeSwitcherComponent,
    ReportDateSelectorComponent,
    ReportShowWeekendsComponent,
    ReportHideUnreportedTasksComponent,
    MatIconModule,
    MatButtonModule,
    NgTemplateOutlet,
  ],
})
export class ReportMenuComponent {
  protected readonly reportMode: Signal<ReportMode>;
  protected readonly tags: Signal<Tag[]>;
  protected readonly date: Signal<Date | null>;
  protected readonly startDate: Signal<Date | null>;
  protected readonly endDate: Signal<Date | null>;
  protected readonly showWeekends: Signal<boolean>;
  protected readonly hideUnreportedTasks: Signal<boolean>;
  protected readonly isSmallerThanDesktop: Signal<boolean>;
  protected readonly showDatePicker: Signal<boolean>;

  protected ReportMode = ReportMode;

  private readonly matDialog: MatDialog = inject(MatDialog);
  private readonly reportService: ReportService = inject(ReportService);
  private readonly breakpointObserver: BreakpointObserver = inject(BreakpointObserver);

  private readonly smallerThanDesktopBreakpoint: string = '(max-width: 1300px)';

  private readonly dialogTemplate: Signal<TemplateRef<HTMLDivElement>> = viewChild.required<TemplateRef<HTMLDivElement>>('smallScreenDialog');

  constructor() {
    this.reportMode = this.reportService.reportMode;
    this.tags = this.reportService.tags;
    this.date = this.reportService.date;
    this.startDate = this.reportService.startDate;
    this.endDate = this.reportService.endDate;
    this.showWeekends = this.reportService.showWeekends;
    this.hideUnreportedTasks = this.reportService.hideUnreportedTasks;
    this.isSmallerThanDesktop = toSignal(
      this.breakpointObserver.observe(this.smallerThanDesktopBreakpoint)
        .pipe(
          map(
            (results: BreakpointState) => results.matches && results.breakpoints[this.smallerThanDesktopBreakpoint],
          ),
        ),
      { initialValue: false },
    );
    this.showDatePicker = computed(() => ['dateRange', 'date'].includes(this.reportMode()));
  }

  protected onReportModeChange(
    value: ReportMode,
  ): void {
    this.reportService.setReportMode(value);
  }

  protected onTagChange(
    value: Tag[],
  ): void {
    this.reportService.setTags(value);
  }

  protected onDateChange(
    date: Date | null,
  ): void {
    this.reportService.setDate(date);
  }

  protected onStartDateChange(
    date: Date | null,
  ): void {
    this.reportService.setStartDate(date);
  }

  protected onEndDateChange(
    date: Date | null,
  ): void {
    this.reportService.setEndDate(date);
  }

  protected onShowWeekendsChange(
    showWeekends: boolean,
  ): void {
    this.reportService.setShowWeekends(showWeekends);
  }

  protected onHideUnreportedTasksChange(
    hideUnreportedTasks: boolean,
  ): void {
    this.reportService.setHideUnreportedTasks(hideUnreportedTasks);
  }

  protected onSmallScreenMenuToggle(): void {
    this.matDialog.open(
      this.dialogTemplate(),
    );
  }
}
