import { Component, Input } from '@angular/core';


@Component({
  selector: 'settings-task-list-configurator',
  templateUrl: './task-list-configurator.component.html',
  styleUrls: ['./task-list-configurator.component.scss'],
})
export class TaskListConfiguratorComponent {
  @Input()
  public disabled: boolean | null = false;
}
