import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, type Signal, type TemplateRef, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ResponsiveMenuService } from '@shared/services/responsive-menu.service';

import { ReportSettingsControlsComponent } from '@report/components/report-settings-controls/report-settings-controls.component';
import type { ReportSettingsControlsState } from '@report/interfaces/report-settings-controls-state.interface';
import type { ReportSettingsIntent } from '@report/interfaces/report-settings-intent.interface';
import { ReportService } from '@report/services/report.service';

@Component({
  selector: 'report-menu',
  templateUrl: './report-menu.component.html',
  styleUrls: ['./report-menu.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReportSettingsControlsComponent,
    MatIconModule,
    MatButtonModule,
    NgTemplateOutlet,
  ],
})
export class ReportMenuComponent {
  protected readonly state: Signal<ReportSettingsControlsState>;
  protected readonly isSmallerThanDesktop: Signal<boolean>;

  private readonly matDialog: MatDialog = inject(MatDialog);
  private readonly reportService: ReportService = inject(ReportService);
  private readonly responsiveMenuService: ResponsiveMenuService = inject(ResponsiveMenuService);

  private readonly dialogTemplate: Signal<TemplateRef<HTMLDivElement>> = viewChild.required<TemplateRef<HTMLDivElement>>('smallScreenDialog');

  constructor() {
    this.state = this.reportService.settingsControlsState;
    this.isSmallerThanDesktop = this.responsiveMenuService.isSmallerThanDesktop;
  }

  protected onSettingsIntent(
    intent: ReportSettingsIntent,
  ): void {
    this.reportService.applySettingsChange({
      type: 'settings-intent',
      intent,
    });
  }

  protected onSmallScreenMenuToggle(): void {
    this.matDialog.open(
      this.dialogTemplate(),
    );
  }
}
