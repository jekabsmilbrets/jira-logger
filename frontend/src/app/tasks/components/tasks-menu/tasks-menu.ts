import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type ResourceRef,
  type Signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
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

import { Settings } from '@core/services/settings';

import type { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { ResponsiveMenu } from '@shared/services/responsive-menu';
import { Tags } from '@shared/services/tags';
import { Tasks } from '@shared/services/tasks';

import { TasksSettingsDialog } from '@tasks/components/tasks-menu/settings-dialog/tasks-settings-dialog';
import { TasksSettingsToggle } from '@tasks/components/tasks-menu/tasks-settings-toggler/tasks-settings-toggle';
import type { TaskImportOutcome, TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import type { TasksSettingsDialogData } from '@tasks/interfaces/tasks-settings-dialog-data.interface';
import { TaskBackup } from '@tasks/services/task-backup/task-backup';
import { TaskFormSession } from '@tasks/services/task-form-session';

import { JiraApiSettingsAdapter } from '@settings/adapters/jira-api-settings.adapter';

@Component({
  selector: 'tasks-menu',
  templateUrl: './tasks-menu.html',
  styleUrls: ['./tasks-menu.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    TasksSettingsToggle,
    MatButtonModule,
    MatInputModule,
    MatSnackBarModule,
    MatIconModule,
    NgTemplateOutlet,
    MatTooltipModule,
    FormField,
  ],
})
export class TasksMenu {
  private readonly tasksService: Tasks = inject(Tasks);

  protected readonly taskFormSession: TaskFormSession = TaskFormSession.create(
    (taskName: string) => this.tasksService.taskExist(taskName),
  );

  private readonly matDialog: MatDialog = inject(MatDialog);
  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);
  private readonly tagsService: Tags = inject(Tags);
  private readonly taskBackupService: TaskBackup = inject(TaskBackup);
  private readonly responsiveMenuService: ResponsiveMenu = inject(ResponsiveMenu);
  private readonly settingsService: Settings = inject(Settings);
  private readonly jiraApiSettingsAdapter: JiraApiSettingsAdapter = inject(JiraApiSettingsAdapter);

  protected readonly isLoading: Signal<boolean> = this.tasksService.isLoading;
  protected readonly isSmallerThanDesktop: Signal<boolean> = this.responsiveMenuService.isSmallerThanDesktop;
  protected readonly tags: Signal<Tag[]> = this.tagsService.tags;
  protected readonly jiraEnabled: Signal<boolean> = computed(
    () => this.jiraApiSettingsAdapter.isEnabled(this.settingsService.settings()),
  );

  private readonly dialogTemplate: Signal<TemplateRef<HTMLDivElement>> = viewChild.required<TemplateRef<HTMLDivElement>>('smallScreenDialog');
  private readonly taskFilterName: Signal<string> = computed(() => this.taskFormSession.draft().name.trim());
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
      .open<TasksSettingsDialog, TasksSettingsDialogData, TaskImportRequest | undefined>(
        TasksSettingsDialog,
        {
          data: {
            currentTasks: this.tasksService.allTasks(),
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

  protected async onOpenJiraImportDialog(): Promise<void> {
    const { JiraTaskImportDialog } = await import(
      '@tasks/components/jira-task-import-dialog/jira-task-import-dialog'
      );

    this.matDialog.open(JiraTaskImportDialog);
  }

  protected onTagsChange(tags: Tag[]): void {
    this.taskFormSession.setTags(tags);
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

    if (!this.taskFormSession.form().valid()) {
      this.taskFormSession.form().markAsTouched();
      return;
    }

    this.tasksService.create(this.taskFormSession.toTask())
      .pipe(take(1))
      .subscribe(() => this.taskFormSession.reset());
  }
}
