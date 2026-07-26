import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'tasks-view-header',
  templateUrl: './task-view-header.html',
  styleUrls: ['./task-view-header.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class TaskViewHeader {
}
