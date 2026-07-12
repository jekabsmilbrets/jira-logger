import { ChangeDetectionStrategy, Component, input, type InputSignal, output, type OutputEmitterRef } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { ReportSettingsControlsComponent } from '@report/components/report-settings-controls/report-settings-controls.component';
import type { ReportSettingsControlsState } from '@report/interfaces/report-settings-controls-state.interface';
import type { ReportSettingsIntent } from '@report/interfaces/report-settings-intent.interface';

@Component({
  selector: 'settings-report-configurator',
  templateUrl: './report-configurator.component.html',
  styleUrls: ['./report-configurator.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    ReportSettingsControlsComponent,
  ],
})
export class ReportConfiguratorComponent {
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);
  public readonly reportSettings: InputSignal<ReportSettingsControlsState> = input.required<ReportSettingsControlsState>();

  protected readonly reportSettingsChange: OutputEmitterRef<ReportSettingsIntent> = output<ReportSettingsIntent>();
}
