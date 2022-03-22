import { Component, EventEmitter, Input, OnInit, Output }      from '@angular/core';
import { FormControl, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MatDialog, MatDialogRef }                             from '@angular/material/dialog';

import { Observable, take, switchMap, of, throwError } from 'rxjs';

import { AreYouSureService } from '@shared/services/are-you-sure.service';

import { TimeLogListModalComponent } from '@task/components/time-log-list-modal/time-log-list-modal.component';
import { defaultSelectTags }         from '@task/constants/default-tags.constants';

import { TaskTagsEnum } from '@task/enums/task-tags.enum';

import { TaskUpdateActionEnum }           from '@task/enums/task-update-action.enum';
import { TimeLogsModalResponseInterface } from '@task/interfaces/time-logs-modal-response.interface';

import { Task }         from '@task/models/task.model';
import { TimeLog }      from '@task/models/time-log.model';
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
  @Output()
  public reloadData: EventEmitter<void> = new EventEmitter<void>();

  public tasks$: Observable<Task[]>;

  public editMode = false;

  public formGroup: FormGroup = new FormGroup(
    {
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

                                                  if (
                                                    tasks.find(
                                                      (task: Task) => task.name === value && this.task.uuid !== task.uuid,
                                                    )
                                                  ) {
                                                    return of({'duplicate-task': true});
                                                  }

                                                  return of(null);
                                                },
                                              ),
                                            ),
        ],
      ),
      description: new FormControl(),
      tags: new FormControl([TaskTagsEnum.opex]),
    },
  );

  public tags: { viewValue: string; value: TaskTagsEnum }[] = defaultSelectTags;
  private dialogRef!: MatDialogRef<TimeLogListModalComponent, TimeLogsModalResponseInterface | undefined>;

  constructor(
    private tasksService: TasksService,
    public dialog: MatDialog,
    private areYouSureService: AreYouSureService,
  ) {
    this.tasks$ = this.tasksService.tasks$;
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

  public viewTag(tag: TaskTagsEnum): string {
    return this.tags.find(
      (sTag) => sTag.value === tag,
    )?.viewValue ?? '';
  }

  public onUpdate(task: Task): void {
    task.name = this.formGroup.get('name')?.value;
    task.description = this.formGroup.get('description')?.value;
    task.tags = this.formGroup.get('tags')?.value ?? [];
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
    if (!task.lastTimeLogId) {
      task.startTimeLog();
      action = TaskUpdateActionEnum.startWorkLog;
    } else {
      task.stopTimeLog();
      action = TaskUpdateActionEnum.stopWorkLog;
    }

    this.update.emit(
      [
        task,
        action,
      ],
    );
  }

  public toggleEditMode(): void {
    this.editMode = !this.editMode;
    this.formGroup.patchValue(
      {
        name: this.task.name,
        description: this.task.description,
      },
    );
  }

  public onOpenTimeLogsModal(task: Task): void {
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

                    task.timeLogs = result.responseData as TimeLog[];
                    task.updateTimeLogged();

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
}
