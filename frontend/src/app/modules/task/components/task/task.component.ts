import { Component, EventEmitter, Input, OnInit, Output }      from '@angular/core';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef }                             from '@angular/material/dialog';

import { Observable, of, switchMap, take, throwError } from 'rxjs';

import { Tag } from '@shared/models/tag.model';

import { Task }    from '@shared/models/task.model';
import { TimeLog } from '@shared/models/time-log.model';

import { AreYouSureService } from '@shared/services/are-you-sure.service';
import { TagsService }       from '@shared/services/tags.service';
import { TasksService }      from '@shared/services/tasks.service';

import { TimeLogListModalComponent } from '@task/components/time-log-list-modal/time-log-list-modal.component';

import { TaskUpdateActionEnum }           from '@task/enums/task-update-action.enum';
import { TimeLogsModalResponseInterface } from '@task/interfaces/time-logs-modal-response.interface';


@Component(
  {
    selector: 'app-task',
    templateUrl: './task.component.html',
    styleUrls: ['./task.component.scss'],
  },
)
export class TaskComponent implements OnInit {
  @Input()
  public task!: Task;

  @Input()
  public isLoading!: boolean | null;

  @Output()
  public update: EventEmitter<[Task, TaskUpdateActionEnum]> = new EventEmitter<[Task, TaskUpdateActionEnum]>();
  @Output()
  public remove: EventEmitter<Task> = new EventEmitter<Task>();
  @Output()
  public reloadData: EventEmitter<void> = new EventEmitter<void>();
  @Output()
  public createTimeLog: EventEmitter<[Task, TimeLog]> = new EventEmitter<[Task, TimeLog]>();
  @Output()
  public updateTimeLog: EventEmitter<[Task, TimeLog]> = new EventEmitter<[Task, TimeLog]>();
  @Output()
  public removeTimeLog: EventEmitter<[Task, TimeLog]> = new EventEmitter<[Task, TimeLog]>();

  public tasks$: Observable<Task[]>;

  public editMode = false;

  public formGroup: FormGroup<{
    name: FormControl<string | null>;
    description: FormControl<string | null>;
    tags: FormControl<Tag[] | null>;
  }> = new FormGroup<{
    name: FormControl<string | null>;
    description: FormControl<string | null>;
    tags: FormControl<Tag[] | null>;
  }>(
    {
      name: new FormControl<string | null>(
        null,
        [Validators.required],
        [
          (control: AbstractControl) => this.tasks$
                                            .pipe(
                                              take(1),
                                              switchMap(
                                                (tasks: Task[]) => {
                                                  const value = control.value;

                                                  if (
                                                    tasks.find(
                                                      (task: Task) => task.name === value && this.task.id !== task.id,
                                                    )
                                                  ) {
                                                    // eslint-disable-next-line @typescript-eslint/naming-convention
                                                    return of({'duplicate-task': true});
                                                  }

                                                  return of(null);
                                                },
                                              ),
                                            ),
        ],
      ),
      description: new FormControl<string | null>(null),
      tags: new FormControl<Tag[]>([]),
    },
  );

  public tags$: Observable<Tag[]>;

  private dialogRef!: MatDialogRef<TimeLogListModalComponent, TimeLogsModalResponseInterface | undefined>;

  constructor(
    private tasksService: TasksService,
    public dialog: MatDialog,
    private areYouSureService: AreYouSureService,
    private tagsService: TagsService,
  ) {
    this.tasks$ = this.tasksService.tasks$;
    this.tags$ = this.tagsService.tags$;
  }

  public ngOnInit(): void {
    this.formGroup.patchValue(
      {
        name: this.task.name,
        description: this.task.description,
        tags: this.task.tags,
      },
    );
  }

  public onUpdate(task: Task): void {
    Object.assign(task, this.formGroup.getRawValue() as Partial<Task>);
    task.updateTimeLogged();

    this.update.emit(
      [
        task,
        TaskUpdateActionEnum.update,
      ],
    );
  }

  public onRemove(task: Task): void {
    this.areYouSureService.openDialog(`Task "${task.name}"`)
        .pipe(
          take(1),
        )
        .subscribe(
          (response: boolean | undefined) => {
            if (response === true) {
              this.remove.emit(task);
            }
          },
        );
  }

  public onToggleTimeLog(task: Task): void {
    let action: TaskUpdateActionEnum;
    let timeLog: TimeLog | undefined;
    if (!this.isTimeLogRunning(task)) {
      action = TaskUpdateActionEnum.startWorkLog;

      const startTime = new Date();
      timeLog = new TimeLog(
        {
          startTime,
        },
      );

      this.createTimeLog.emit(
        [
          task,
          timeLog,
        ],
      );

      task.timeLogs.push(timeLog);
    } else {
      action = TaskUpdateActionEnum.stopWorkLog;

      timeLog = task.timeLogs.find((t) => t.id === task.lastTimeLog?.id);

      if (timeLog) {
        timeLog.endTime = new Date();

        this.updateTimeLog.emit(
          [
            task,
            timeLog,
          ],
        );
      }
    }

    this.update.emit(
      [
        task,
        action,
      ],
    );
  }

  public isSameTag(tag1: Tag, tag2: Tag): boolean {
    return tag1.id === tag2.id;
  }

  public toggleEditMode(): void {
    this.editMode = !this.editMode;
    this.formGroup.patchValue(
      {
        name: this.task.name,
        description: this.task.description,
        tags: this.task.tags,
      },
    );
  }

  public onOpenTimeLogsModal(task: Task): void {
    const existingTimeLog: TimeLog[] = task.timeLogs.map((timeLog: TimeLog) => timeLog);

    this.dialogRef = this.dialog.open(
      TimeLogListModalComponent,
      {
        disableClose: true,
        data: {
          task,
        },
      },
    );

    this.dialogRef.afterClosed()
        .pipe(
          take(1),
          switchMap(
            (result: TimeLogsModalResponseInterface | undefined) => {
              if (result) {
                switch (result.responseType) {
                  case 'cancel':
                    this.reloadData.emit();
                    return of(true);

                  case 'update':
                    if (!result.hasOwnProperty('responseData')) {
                      return throwError(() => new Error('Missing response data'));
                    }

                    const timeLogs: TimeLog[] = result.responseData as TimeLog[];
                    task.timeLogs = timeLogs;

                    const existingTimeLogIds: string[] = timeLogs.map((timeLog) => timeLog.id);

                    timeLogs.forEach((timeLog) => {
                      if (!timeLog.id) {
                        this.createTimeLog.emit(
                          [
                            task,
                            timeLog,
                          ],
                        );
                      }
                      if (timeLog.id) {
                        this.updateTimeLog.emit(
                          [
                            task,
                            timeLog,
                          ],
                        );
                      }
                    });

                    const deletedTimeLogs = existingTimeLog.filter((timeLog) => !existingTimeLogIds.includes(timeLog.id));

                    deletedTimeLogs.forEach((timeLog) => this.removeTimeLog.emit(
                      [
                        task,
                        timeLog,
                      ],
                    ));

                    this.update.emit(
                      [
                        task,
                        TaskUpdateActionEnum.update,
                      ],
                    );

                    return of(true);
                }
              }

              return of(false);
            },
          ),
        )
        .subscribe();
  }

  public isTimeLogRunning(task: Task): boolean {
    return !!task.lastTimeLog && !(task.lastTimeLog.endTime instanceof Date);
  }
}
