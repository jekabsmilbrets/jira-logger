import { Component, Output, EventEmitter } from '@angular/core';


@Component(
  {
    selector: 'app-tasks-settings-toggle',
    templateUrl: './tasks-settings-toggle.component.html',
    styleUrls: ['./tasks-settings-toggle.component.scss'],
  },
)
export class TasksSettingsToggleComponent {
  @Output()
  public openSettingsDialog: EventEmitter<void> = new EventEmitter<void>();

  public onOpenSettingsDialog(): void {
    this.openSettingsDialog.emit();
  }
}
