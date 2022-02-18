import { Component, OnInit } from '@angular/core';
import { Task } from 'src/app/models/task.model';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
})
export class TaskListComponent implements OnInit {

  public taskList: Task[] = [
    new Task({name: 'MTET-1010'}),
    new Task({name: 'MTET-1011'}),
    new Task({name: 'MTET-1012'}),
    new Task({name: 'MTET-1013'}),
  ];

  constructor() {
  }

  public ngOnInit(): void {
  }

  public onEdit(task: Task): void {
    console.log('onEdit ', {task});
  }

  public onRemove(task: Task): void {
    console.log('onRemove ', {task});
  }

  public onStartTime(task: Task): void {
    console.log('onStartTime ', {task});
  }

}
