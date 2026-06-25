import { BreakpointObserver, type BreakpointState } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal, type TemplateRef, viewChild } from '@angular/core';
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
import type { ReportStateSnapshot } from '@report/interfaces/report-state-snapshot.interface';
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
  protected readonly state: Signal<ReportStateSnapshot>;
  protected readonly isSmallerThanDesktop: Signal<boolean>;
  protected readonly showDatePicker: Signal<boolean>;

  protected readonly ReportMode: typeof ReportMode = ReportMode;

  private readonly matDialog: MatDialog = inject(MatDialog);
  private readonly reportService: ReportService = inject(ReportService);
  private readonly breakpointObserver: BreakpointObserver = inject(BreakpointObserver);

  private readonly smallerThanDesktopBreakpoint: string = '(max-width: 1300px)';

  private readonly dialogTemplate: Signal<TemplateRef<HTMLDivElement>> = viewChild.required<TemplateRef<HTMLDivElement>>('smallScreenDialog');

  constructor() {
    this.state = this.reportService.state;
    this.isSmallerThanDesktop = toSignal(
      this.breakpointObserver.observe(this.smallerThanDesktopBreakpoint)
        .pipe(
          map(
            (results: BreakpointState) => results.matches && results.breakpoints[this.smallerThanDesktopBreakpoint],
          ),
        ),
      { initialValue: false },
    );
    this.showDatePicker = computed(() => [ReportMode.dateRange, ReportMode.date].includes(this.state().reportMode));
  }

  // fallow-ignore-next-line code-duplication
  protected onReportModeChange(
    value: ReportMode,
  ): void {
    this.reportService.updateState({ reportMode: value });
  }

  protected onTagChange(
    value: Tag[],
  ): void {
    this.reportService.updateState({ tags: value });
  }

  protected onDateChange(
    date: Date | null,
  ): void {
    this.reportService.updateState({ date });
  }

  protected onStartDateChange(
    date: Date | null,
  ): void {
    this.reportService.updateState({ startDate: date });
  }

  protected onEndDateChange(
    date: Date | null,
  ): void {
    this.reportService.updateState({ endDate: date });
  }

  protected onShowWeekendsChange(
    showWeekends: boolean,
  ): void {
    this.reportService.updateState({ showWeekends });
  }

  protected onHideUnreportedTasksChange(
    hideUnreportedTasks: boolean,
  ): void {
    this.reportService.updateState({ hideUnreportedTasks });
  }

  protected onSmallScreenMenuToggle(): void {
    this.matDialog.open(
      this.dialogTemplate(),
    );
  }
}
