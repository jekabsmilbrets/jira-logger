import { ChangeDetectionStrategy, Component, output, type OutputEmitterRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'tasks-settings-toggle',
  templateUrl: './tasks-settings-toggle.component.html',
  styleUrls: ['./tasks-settings-toggle.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
})
export class TasksSettingsToggleComponent {
  protected readonly openSettingsDialog: OutputEmitterRef<void> = output<void>();

  protected onOpenSettingsDialog(): void {
    this.openSettingsDialog.emit();
  }
}
