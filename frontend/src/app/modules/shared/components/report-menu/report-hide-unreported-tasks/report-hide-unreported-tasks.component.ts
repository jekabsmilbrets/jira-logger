import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';

@Component(
  {
    selector: 'shared-report-hide-unreported-tasks',
    templateUrl: './report-hide-unreported-tasks.component.html',
    styleUrls: ['./report-hide-unreported-tasks.component.scss'],
    standalone: false,
  },
)
export class ReportHideUnreportedTasksComponent {
  @Input()
  public disabled: boolean | null = false;

  @Input()
  public hideUnreportedTasks!: boolean | null;

  @Output()
  public hideUnreportedTasksChange: EventEmitter<boolean> = new EventEmitter<boolean>();

  public onHideUnreportedTasksChange(hideUnreportedTasks: MatSlideToggleChange): void {
    this.hideUnreportedTasksChange.emit(hideUnreportedTasks.checked);
  }
}
