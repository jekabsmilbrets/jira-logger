import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { AreYouSureService } from '@shared/services/are-you-sure.service';

import { TaskUpdateActionEnum } from '@tasks/enums/task-update-action.enum';
import { TimeLogsModalResponseInterface } from '@tasks/interfaces/time-logs-modal-response.interface';
import { TaskEditService } from '@tasks/services/task-edit.service';
import { TimeLogEditService } from '@tasks/services/time-log-edit.service';

import { Observable, take } from 'rxjs';

@Component(
  {
    selector: 'tasks-task',
    templateUrl: './task.component.html',
    styleUrls: ['./task.component.scss'],
    standalone: false,
  },
)
export class TaskComponent implements OnInit {
  @Input()
  public task!: Task;

  @Input()
  public isLoading!: boolean | null;

  @Output()
  public action: EventEmitter<[Task, TaskUpdateActionEnum]> = new EventEmitter<[Task, TaskUpdateActionEnum]>();

  @Output()
  public update: EventEmitter<Task> = new EventEmitter<Task>();

  @Output()
  public remove: EventEmitter<Task> = new EventEmitter<Task>();

  @Output()
  public createTimeLog: EventEmitter<[Task, TimeLog]> = new EventEmitter<[Task, TimeLog]>();

  @Output()
  public updateTimeLog: EventEmitter<[Task, TimeLog]> = new EventEmitter<[Task, TimeLog]>();

  @Output()
  public removeTimeLog: EventEmitter<[Task, TimeLog]> = new EventEmitter<[Task, TimeLog]>();

  public formGroup!: FormGroup;

  public editMode = false;

  constructor(
    private areYouSureService: AreYouSureService,
    private taskEditService: TaskEditService,
    private timeLogEditService: TimeLogEditService,
  ) {
  }

  public get tags$(): Observable<Tag[]> {
    return this.taskEditService.tags$;
  }

  public ngOnInit(): void {
    this.formGroup = this.taskEditService.createFormGroup(this.task);
  }

  public isSameTag(tag1: Tag, tag2: Tag): boolean {
    return tag1.id === tag2.id;
  }

  public isTimeLogRunning(): boolean {
    return this.task.isTimeLogRunning;
  }

  public onUpdate(): void {
    Object.assign(
      this.task,
      this.formGroup.getRawValue() as Partial<Task>,
    );
    this.task.updateTimeLogged();

    this.update.emit(this.task);
    this.onToggleEditMode();
  }

  public onRemove(): void {
    this.areYouSureService.openDialog(`Task "${ this.task.name }"`)
      .pipe(
        take(1),
      )
      .subscribe(
        (response: boolean | undefined) => {
          if (response === true) {
            this.remove.emit(this.task);
          }
        },
      );
  }

  public onToggleEditMode(): void {
    this.editMode = !this.editMode;

    if (this.editMode) {
      this.formGroup = this.taskEditService.createFormGroup(this.task);
    }
  }

  public onToggleTimeLogging(): void {
    const action = this.isTimeLogRunning() ?
      TaskUpdateActionEnum.stopWorkLog : TaskUpdateActionEnum.startWorkLog;

    this.action.emit(
      [
        this.task,
        action,
      ],
    );
  }

  public onOpenTimeLogsModal(): void {
    this.timeLogEditService.openTimeLogsListDialog(this.task)
      .pipe(take(1))
      .subscribe(
        (response: TimeLogsModalResponseInterface | undefined) => {
          if (response) {
            this.createTimeLogs(response.created);
            this.updateTimeLogs(response.updated);
            this.deleteTimeLogs(response.deleted);
          }
        },
      );
  }

  private createTimeLogs(
    timeLogs: TimeLog[],
  ): void {
    timeLogs.forEach(
      (timeLog: TimeLog) => this.createTimeLog
        .emit(
          [
            this.task,
            timeLog,
          ],
        ),
    );
  }

  private updateTimeLogs(
    timeLogs: TimeLog[],
  ): void {
    timeLogs.forEach(
      (timeLog: TimeLog) => this.updateTimeLog
        .emit(
          [
            this.task,
            timeLog,
          ],
        ),
    );
  }

  private deleteTimeLogs(
    timeLogs: TimeLog[],
  ): void {
    timeLogs.forEach(
      (timeLog: TimeLog) => this.removeTimeLog
        .emit(
          [
            this.task,
            timeLog,
          ],
        ),
    );
  }
}
