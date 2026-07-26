import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, type Signal, type TemplateRef, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ResponsiveMenu } from '@shared/services/responsive-menu';

import { ReportSettingsControls } from '@report/components/report-settings-controls/report-settings-controls';
import type { ReportSettingsControlsState } from '@report/interfaces/report-settings-controls-state.interface';
import type { ReportSettingsIntent } from '@report/interfaces/report-settings-intent.interface';
import { Report } from '@report/services/report';

@Component({
  selector: 'report-menu',
  templateUrl: './report-menu.html',
  styleUrls: ['./report-menu.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReportSettingsControls,
    MatIconModule,
    MatButtonModule,
    NgTemplateOutlet,
  ],
})
export class ReportMenu {
  protected readonly state: Signal<ReportSettingsControlsState>;
  protected readonly isSmallerThanDesktop: Signal<boolean>;

  private readonly matDialog: MatDialog = inject(MatDialog);
  private readonly reportService: Report = inject(Report);
  private readonly responsiveMenuService: ResponsiveMenu = inject(ResponsiveMenu);

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
