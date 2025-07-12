import { Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'shared-report-hide-unreported-tasks',
  templateUrl: './report-hide-unreported-tasks.component.html',
  styleUrls: ['./report-hide-unreported-tasks.component.scss'],
  standalone: true,
  imports: [
    MatSlideToggleModule,
  ],
})
export class ReportHideUnreportedTasksComponent {
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);
  public readonly hideUnreportedTasks: InputSignal<boolean> = input.required<boolean>();

  protected readonly hideUnreportedTasksChange: OutputEmitterRef<boolean> = output<boolean>();

  protected onHideUnreportedTasksChange(
    hideUnreportedTasks: MatSlideToggleChange,
  ): void {
    this.hideUnreportedTasksChange.emit(hideUnreportedTasks.checked);
  }
}
