import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  type InputSignal,
  output,
  type OutputEmitterRef,
  signal,
  type WritableSignal,
} from '@angular/core';
import { disabled, type FieldTree, form } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { reportModes } from '@report/constants/report-modes.constant';
import { ReportMode } from '@report/enums/report-mode.enum';
import type { ReportModeFormValue } from '@report/interfaces/report-mode-form-value.interface';

@Component({
  selector: 'shared-report-mode-switcher',
  templateUrl: './report-mode-switcher.component.html',
  styleUrls: ['./report-mode-switcher.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormFieldModule,
    MatSelectModule,
  ],
})
export class ReportModeSwitcherComponent {
  public readonly showLabel: InputSignal<boolean> = input<boolean>(false);
  public readonly disabled: InputSignal<boolean | null | undefined> = input<boolean | null>();
  public readonly reportMode: InputSignal<ReportMode | null | undefined> = input<ReportMode | null>();

  protected reportModes: {
    value: ReportMode;
    viewValue: string;
  }[] = reportModes;
  protected readonly reportModeFormModel: WritableSignal<ReportModeFormValue> = signal<ReportModeFormValue>({
    reportMode: ReportMode.total,
  });
  protected readonly reportModeForm: FieldTree<ReportModeFormValue> = form(this.reportModeFormModel, (path) => {
    disabled(path, () => !!this.disabled());
  });

  protected readonly reportModeChange: OutputEmitterRef<ReportMode> = output<ReportMode>();

  constructor() {
    effect(() => {
      const reportMode: ReportMode | null | undefined = this.reportMode();
      this.reportModeForm().reset({
        reportMode: reportMode ?? ReportMode.total,
      });
    });
  }

  protected reportModeValueChange(
    value: ReportMode,
  ): void {
    const field: ReturnType<typeof this.reportModeForm.reportMode> = this.reportModeForm.reportMode();
    field.value.set(value);
    field.markAsDirty();
    field.markAsTouched({ skipDescendants: true });
    this.reportModeChange.emit(value);
  }
}
