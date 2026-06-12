import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tasks-view-header',
  templateUrl: './task-view-header.component.html',
  styleUrls: ['./task-view-header.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
})
export class TaskViewHeaderComponent {
}
