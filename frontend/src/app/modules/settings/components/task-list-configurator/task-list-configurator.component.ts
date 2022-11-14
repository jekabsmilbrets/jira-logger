import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-task-list-configurator',
  templateUrl: './task-list-configurator.component.html',
  styleUrls: ['./task-list-configurator.component.scss'],
})
export class TaskListConfiguratorComponent {
  @Input()
  public disabled: boolean | null = false;
}
