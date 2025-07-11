import { Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'shared-report-show-weekends',
  templateUrl: './report-show-weekends.component.html',
  styleUrls: ['./report-show-weekends.component.scss'],
  standalone: true,
  imports: [
    MatSlideToggleModule,
  ],
})
export class ReportShowWeekendsComponent {
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);
  public readonly showWeekends: InputSignal<boolean> = input.required<boolean>();

  protected readonly showWeekendsChange: OutputEmitterRef<boolean> = output<boolean>();

  protected onShowWeekendsChange(
    showWeekends: MatSlideToggleChange,
  ): void {
    this.showWeekendsChange.emit(showWeekends.checked);
  }
}
