import { Component, output, OutputEmitterRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'tasks-settings-toggle',
  templateUrl: './tasks-settings-toggle.component.html',
  styleUrls: ['./tasks-settings-toggle.component.scss'],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
  ],
})
export class TasksSettingsToggleComponent {
  protected readonly openSettingsDialog: OutputEmitterRef<void> = output<void>();

  protected onOpenSettingsDialog(): void {
    this.openSettingsDialog.emit();
  }
}
