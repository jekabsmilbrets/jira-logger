import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type ResourceRef,
  type Signal,
  signal,
  type TemplateRef,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { type FieldTree, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { catchError, debounceTime, of, take } from 'rxjs';

import type { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { ResponsiveMenuService } from '@shared/services/responsive-menu.service';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';

import { TasksSettingsDialogComponent } from '@tasks/components/tasks-menu/settings-dialog/tasks-settings-dialog.component';
import { TasksSettingsToggleComponent } from '@tasks/components/tasks-menu/tasks-settings-toggler/tasks-settings-toggle.component';
import type { TaskImportOutcome, TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import type { TaskFormValue } from '@tasks/interfaces/task-form-value.interface';
import { TaskBackupService } from '@tasks/services/task-backup.service';
import {
  buildEmptyTaskFormValue,
  buildTaskCreateForm,
  buildTaskCreatePayload,
  setTaskFormTags,
} from '@tasks/utilities/task-form-intent.utility';

@Component({
  selector: 'tasks-menu',
  templateUrl: './tasks-menu.component.html',
  styleUrls: ['./tasks-menu.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    TasksSettingsToggleComponent,
    MatButtonModule,
    MatInputModule,
    MatSnackBarModule,
    MatIconModule,
    NgTemplateOutlet,
    MatTooltipModule,
    FormField,
  ],
})
export class TasksMenuComponent {
  protected readonly createTaskFormModel: WritableSignal<TaskFormValue> = signal<TaskFormValue>(buildEmptyTaskFormValue());

  private readonly tasksService: TasksService = inject(TasksService);

  protected readonly createTaskForm: FieldTree<TaskFormValue> = buildTaskCreateForm(
    this.createTaskFormModel,
    (taskName: string) => this.tasksService.taskExist(taskName),
  );

  private readonly matDialog: MatDialog = inject(MatDialog);
  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);
  private readonly tagsService: TagsService = inject(TagsService);
  private readonly taskBackupService: TaskBackupService = inject(TaskBackupService);
  private readonly responsiveMenuService: ResponsiveMenuService = inject(ResponsiveMenuService);

  protected readonly isLoading: Signal<boolean> = this.tasksService.isLoading;
  protected readonly isSmallerThanDesktop: Signal<boolean> = this.responsiveMenuService.isSmallerThanDesktop;
  protected readonly tags: Signal<Tag[]> = this.tagsService.tags;

  private readonly dialogTemplate: Signal<TemplateRef<HTMLDivElement>> = viewChild.required<TemplateRef<HTMLDivElement>>('smallScreenDialog');
  private readonly taskFilterName: Signal<string> = computed(() => this.createTaskForm.name().value().trim());
  private readonly debouncedTaskFilterName: Signal<string> = toSignal(
    toObservable(this.taskFilterName).pipe(debounceTime(300)),
    { initialValue: this.taskFilterName() },
  );
  private readonly taskFilterResource: ResourceRef<Task[] | null | undefined> = rxResource<Task[] | null, string>({
    params: this.debouncedTaskFilterName,
    stream: ({ params }) => {
      const filter: TaskListFilter = params ? { name: params } : {};

      return this.tasksService.loadVisibleTasks(filter)
        .pipe(
          take(1),
          catchError(() => of(null)),
        );
    },
  });
  private readonly taskFilterRefresh: Signal<Task[] | null> = computed(() => this.taskFilterResource.value() ?? null);

  constructor() {
    this.taskFilterRefresh();
  }

  protected onOpenSettingsDialog(): void {
    this.matDialog
      .open<TasksSettingsDialogComponent, { tasks: Task[] }, TaskImportRequest | undefined>(
        TasksSettingsDialogComponent,
        {
          data: {
            tasks: this.tasksService.allTasks(),
          },
        },
      )
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: TaskImportRequest | undefined) => {
        if (!result) {
          return;
        }

        this.taskBackupService.applyTaskBackupForUser(result)
          .pipe(take(1))
          .subscribe((outcome: TaskImportOutcome) => this.matSnackBar.open(
            outcome.message,
            undefined,
            { duration: outcome.duration },
          ));
      });
  }

  protected onTagsChange(tags: Tag[]): void {
    setTaskFormTags(this.createTaskForm.tags(), tags);
  }

  protected isSameTag(tag1: Tag, tag2: Tag): boolean {
    return tag1.id === tag2.id;
  }

  protected onSmallScreenMenuToggle(): void {
    this.matDialog.open(
      this.dialogTemplate(),
    );
  }

  protected onCreate(event?: Event): void {
    event?.preventDefault?.();

    if (!this.createTaskForm().valid()) {
      this.createTaskForm().markAsTouched();
      return;
    }

    this.tasksService.create(buildTaskCreatePayload(this.createTaskFormModel()))
      .pipe(take(1))
      .subscribe(() => this.createTaskForm().reset(buildEmptyTaskFormValue()));
  }
}
