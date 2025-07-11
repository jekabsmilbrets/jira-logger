import { Component, input, InputSignal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'settings-task-list-configurator',
  templateUrl: './task-list-configurator.component.html',
  styleUrls: ['./task-list-configurator.component.scss'],
  standalone: true,
  imports: [
    MatCardModule,
  ],
})
export class TaskListConfiguratorComponent {
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);
}
