import { Component, EventEmitter, Output } from '@angular/core';

@Component(
  {
    selector: 'tasks-settings-toggle',
    templateUrl: './tasks-settings-toggle.component.html',
    styleUrls: ['./tasks-settings-toggle.component.scss'],
    standalone: false,
  },
)
export class TasksSettingsToggleComponent {
  @Output()
  public openSettingsDialog: EventEmitter<void> = new EventEmitter<void>();

  public onOpenSettingsDialog(): void {
    this.openSettingsDialog.emit();
  }
}
