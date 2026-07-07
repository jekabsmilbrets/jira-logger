import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type Signal,
  signal,
  type TemplateRef,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { type FieldTree, form, FormField, required, validateAsync } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { take } from 'rxjs';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { ResponsiveMenuService } from '@shared/services/responsive-menu.service';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';

import { TasksSettingsDialogComponent } from '@tasks/components/tasks-menu/settings-dialog/tasks-settings-dialog.component';
import { TasksSettingsToggleComponent } from '@tasks/components/tasks-menu/tasks-settings-toggler/tasks-settings-toggle.component';
import type { TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import type { TaskFormValue } from '@tasks/interfaces/task-form-value.interface';
import { TasksMenuService } from '@tasks/services/tasks-menu.service';
import {
  buildDuplicateTaskNameError,
  buildEmptyTaskFormValue,
  createDuplicateTaskNameValidator,
  normalizeTaskNameForDuplicateCheck,
} from '@tasks/utility/task-form-intent.utility';

@Component({
  selector: 'tasks-menu',
  templateUrl: './tasks-menu.component.html',
  styleUrls: ['./tasks-menu.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TasksMenuService],
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

  protected readonly createTaskForm: FieldTree<TaskFormValue> = form(this.createTaskFormModel, (path) => {
    required(path.name, { message: 'Task name is required.' });
    validateAsync(path.name, {
      params: ({ value }) => normalizeTaskNameForDuplicateCheck(value()),
      debounce: 300,
      factory: (name) => createDuplicateTaskNameValidator(name, (taskName: string) => this.tasksService.taskExist(taskName)),
      onSuccess: (isDuplicate) => buildDuplicateTaskNameError(isDuplicate),
      onError: () => buildDuplicateTaskNameError(true),
    });
  });

  private readonly matDialog: MatDialog = inject(MatDialog);
  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);
  private readonly tagsService: TagsService = inject(TagsService);
  private readonly responsiveMenuService: ResponsiveMenuService = inject(ResponsiveMenuService);
  private readonly tasksMenuService: TasksMenuService = inject(TasksMenuService);

  protected readonly isLoading: Signal<boolean> = this.tasksService.isLoading;
  protected readonly isSmallerThanDesktop: Signal<boolean> = this.responsiveMenuService.isSmallerThanDesktop;
  protected readonly tags: Signal<Tag[]> = this.tagsService.tags;

  private readonly dialogTemplate: Signal<TemplateRef<HTMLDivElement>> = viewChild.required<TemplateRef<HTMLDivElement>>('smallScreenDialog');
  private readonly taskFilterName: Signal<string> = computed(() => this.createTaskForm.name().value().trim());
  private readonly taskFilterRefresh: Signal<Task[] | null> = this.tasksMenuService.createTaskRefresh(this.taskFilterName);

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
        this.tasksMenuService.importTasks(
          result,
          (message, duration) => this.matSnackBar.open(message, undefined, { duration }),
        );
      });
  }

  protected onTagsChange(tags: Tag[]): void {
    this.tasksMenuService.updateTags(this.createTaskForm, tags);
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

    this.tasksMenuService.createTask(this.createTaskForm, this.createTaskFormModel);
  }
}
