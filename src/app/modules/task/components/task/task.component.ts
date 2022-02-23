import { Component, Input, EventEmitter, Output, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl } from '@angular/forms';

import { take, switchMap, of, Observable } from 'rxjs';

import { TaskUpdateActionEnum } from '@task/enums/task-update-action.enum';

import { Task } from '@task/models/task.model';
import { TasksService } from '@task/services/tasks.service';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
})
export class TaskComponent implements OnInit {
  @Input()
  public task!: Task;

  @Output()
  public update: EventEmitter<[Task, TaskUpdateActionEnum]> = new EventEmitter<[Task, TaskUpdateActionEnum]>();
  @Output()
  public remove: EventEmitter<Task> = new EventEmitter<Task>();

  public tasks$: Observable<Task[]>;

  public editMode = false;

  public formGroup: FormGroup = new FormGroup({
    name: new FormControl(
      undefined,
      [Validators.required],
      [
        (control: AbstractControl) => this.tasks$
                                          .pipe(
                                            take(1),
                                            switchMap(
                                              (tasks: Task[]) => {
                                                const value = control.value;

                                                if (tasks.find((task) => task.name === value && this.task.id !== task.id)) {
                                                  return of({'duplicate-task': true});
                                                }

                                                return of(null);
                                              },
                                            ),
                                          ),
      ]),
    description: new FormControl(),
  });

  constructor(
    private tasksService: TasksService,
  ) {
    this.tasks$ = this.tasksService.tasks$;
  }

  public ngOnInit(): void {
    this.formGroup.patchValue({
      name: this.task.name,
      description: this.task.description,
    });
  }

  public onUpdate(task: Task): void {
    task.name = this.formGroup.get('name')?.value;
    task.description = this.formGroup.get('description')?.value;

    this.update.emit([
      task,
      TaskUpdateActionEnum.update,
    ]);
  }

  public onRemove(task: Task): void {
    this.remove.emit(task);
  }

  public onToggleTimeLog(task: Task): void {
    let action: TaskUpdateActionEnum;
    if (!task.lastTimeLogId) {
      task.startTimeLog();
      action = TaskUpdateActionEnum.startWorkLog;
    } else {
      task.stopTimeLog();
      action = TaskUpdateActionEnum.stopWorkLog;
    }

    this.update.emit([
      task,
      action,
    ]);
  }
}
