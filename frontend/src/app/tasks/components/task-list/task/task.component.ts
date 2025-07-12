import { CommonModule } from '@angular/common';
import { Component, inject, input, InputSignal, OnInit, output, OutputEmitterRef } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';
import { ReadableTimePipe } from '@shared/pipes/readable-time.pipe';
import { AreYouSureService } from '@shared/services/are-you-sure.service';

import { TaskUpdateActionEnum } from '@tasks/enums/task-update-action.enum';
import { TimeLogsModalResponseInterface } from '@tasks/interfaces/time-logs-modal-response.interface';
import { TaskEditService } from '@tasks/services/task-edit.service';
import { TimeLogEditService } from '@tasks/services/time-log-edit.service';

import { Observable, take } from 'rxjs';

@Component({
  selector: 'tasks-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    ReadableTimePipe,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    MatTooltipModule,
    MatInputModule,
  ],
})
export class TaskComponent implements OnInit {
  public readonly task: InputSignal<Task> = input.required<Task>();
  public readonly isLoading: InputSignal<boolean> = input.required<boolean>();

  protected readonly action: OutputEmitterRef<[Task, TaskUpdateActionEnum]> = output<[
    Task,
    TaskUpdateActionEnum
  ]>();
  protected readonly update: OutputEmitterRef<Task> = output<Task>();
  protected readonly remove: OutputEmitterRef<Task> = output<Task>();
  protected readonly createTimeLog: OutputEmitterRef<[Task, TimeLog]> = output<[
    Task,
    TimeLog
  ]>();
  protected readonly updateTimeLog: OutputEmitterRef<[Task, TimeLog]> = output<[
    Task,
    TimeLog
  ]>();
  protected readonly removeTimeLog: OutputEmitterRef<[Task, TimeLog]> = output<[
    Task,
    TimeLog
  ]>();

  protected formGroup!: FormGroup;

  protected editMode: boolean = false;

  private readonly areYouSureService: AreYouSureService = inject(AreYouSureService);
  private readonly taskEditService: TaskEditService = inject(TaskEditService);
  private readonly timeLogEditService: TimeLogEditService = inject(TimeLogEditService);

  protected get tags$(): Observable<Tag[]> {
    return this.taskEditService.tags$;
  }

  public ngOnInit(): void {
    this.formGroup = this.taskEditService.createFormGroup(this.task());
  }

  protected isSameTag(
    tag1: Tag,
    tag2: Tag,
  ): boolean {
    return tag1.id === tag2.id;
  }

  protected isTimeLogRunning(): boolean {
    return this.task().isTimeLogRunning;
  }

  protected onUpdate(): void {
    const task: Task = this.task();

    Object.assign(
      task,
      this.formGroup.getRawValue() as Partial<Task>,
    );

    task.updateTimeLogged();

    this.update.emit(task);
    this.onToggleEditMode();
  }

  protected onRemove(): void {
    this.areYouSureService.openDialog(`Task "${ this.task().name }"`)
      .pipe(take(1))
      .subscribe((response: boolean | undefined) => {
        if (response === true) {
          this.remove.emit(this.task());
        }
      });
  }

  protected onToggleEditMode(): void {
    this.editMode = !this.editMode;

    if (this.editMode) {
      this.formGroup = this.taskEditService.createFormGroup(this.task());
    }
  }

  protected onToggleTimeLogging(): void {
    const action: TaskUpdateActionEnum = this.isTimeLogRunning() ?
      TaskUpdateActionEnum.stopWorkLog :
      TaskUpdateActionEnum.startWorkLog;

    this.action.emit([
      this.task(),
      action,
    ]);
  }

  protected onOpenTimeLogsModal(): void {
    this.timeLogEditService.openTimeLogsListDialog(this.task())
      .pipe(take(1))
      .subscribe((response: TimeLogsModalResponseInterface | undefined) => {
        if (response) {
          this.createTimeLogs(response.created);
          this.updateTimeLogs(response.updated);
          this.deleteTimeLogs(response.deleted);
        }
      });
  }

  private createTimeLogs(
    timeLogs: TimeLog[],
  ): void {
    timeLogs.forEach(
      (timeLog: TimeLog) => this.createTimeLog.emit([
        this.task(),
        timeLog,
      ]),
    );
  }

  private updateTimeLogs(
    timeLogs: TimeLog[],
  ): void {
    timeLogs.forEach(
      (timeLog: TimeLog) => this.updateTimeLog.emit([
        this.task(),
        timeLog,
      ]),
    );
  }

  private deleteTimeLogs(
    timeLogs: TimeLog[],
  ): void {
    timeLogs.forEach(
      (timeLog: TimeLog) => this.removeTimeLog.emit([
        this.task(),
        timeLog,
      ]),
    );
  }
}
