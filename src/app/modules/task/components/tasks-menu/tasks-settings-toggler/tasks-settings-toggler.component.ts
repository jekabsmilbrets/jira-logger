import { Component, Output, EventEmitter } from '@angular/core';

@Component({
             selector: 'app-tasks-settings-toggler',
             templateUrl: './tasks-settings-toggler.component.html',
             styleUrls: ['./tasks-settings-toggler.component.scss'],
           })
export class TasksSettingsTogglerComponent {
  @Output()
  public openSettingsDialog: EventEmitter<void> = new EventEmitter<void>();

  public onOpenSettingsDialog(): void {
    this.openSettingsDialog.emit();
  }
}
