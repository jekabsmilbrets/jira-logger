import { ChangeDetectionStrategy, Component, computed, inject, injectAsync, type Signal, signal, type WritableSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { type FieldTree, form, FormField, required, validateAsync } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { catchError, map, of, switchMap, take } from 'rxjs';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import type { AsyncLoader } from '@shared/types/async-loader.type';

import { TasksSettingsToggleComponent } from '@tasks/components/tasks-menu/tasks-settings-toggler/tasks-settings-toggle.component';
import type { CreateTaskFormValue } from '@tasks/interfaces/create-task-form-value.interface';
import type { ImportReport, TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import { TaskImportService } from '@tasks/services/task-import.service';
import { TasksMenuFilterService } from '@tasks/services/tasks-menu-filter.service';
import type { TasksSettingsService } from '@tasks/services/tasks-settings.service';

@Component({
  selector: 'tasks-menu',
  templateUrl: './tasks-menu.component.html',
  styleUrls: ['./tasks-menu.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TasksMenuFilterService],
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    TasksSettingsToggleComponent,
    MatButtonModule,
    MatInputModule,
    MatSnackBarModule,
    FormField,
  ],
})
export class TasksMenuComponent {
  protected readonly createTaskFormModel: WritableSignal<CreateTaskFormValue> = signal<CreateTaskFormValue>({
    name: '',
    description: '',
    tags: [],
  });

  private readonly tasksService: TasksService = inject(TasksService);

  protected readonly createTaskForm: FieldTree<CreateTaskFormValue> = form(this.createTaskFormModel, (path) => {
    required(path.name, { message: 'Task name is required.' });
    validateAsync(path.name, {
      params: ({ value }) => {
        const name: string = value().trim();
        return name ? name : undefined;
      },
      debounce: 300,
      factory: (name) => rxResource({
        params: name,
        stream: ({ params }) => {
          if (!params) {
            return of(false);
          }

          return this.tasksService.taskExist(params).pipe(
            map(() => false),
            catchError(() => of(true)),
          );
        },
      }),
      onSuccess: (isDuplicate) => isDuplicate ? {
        kind: 'duplicate-task',
        message: 'Task already exists.',
      } : null,
      onError: () => ({
        kind: 'duplicate-task',
        message: 'Task already exists.',
      }),
    });
  });

  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);
  private readonly loadTasksSettingsService: AsyncLoader<TasksSettingsService> = injectAsync(
    () => import('@tasks/services/tasks-settings.service').then((m) => m.TasksSettingsService),
  );
  private readonly taskImportService: TaskImportService = inject(TaskImportService);
  private readonly tagsService: TagsService = inject(TagsService);
  private readonly tasksMenuFilterService: TasksMenuFilterService = inject(TasksMenuFilterService);

  protected readonly isLoading: Signal<boolean> = this.tasksService.isLoading;
  protected readonly tags: Signal<Tag[]> = this.tagsService.tags;

  private readonly taskFilterName: Signal<string> = computed(() => this.createTaskForm.name().value().trim());
  private readonly taskFilterRefresh: Signal<Task[] | null> = this.tasksMenuFilterService.createTaskRefresh(this.taskFilterName);

  constructor() {
    this.taskFilterRefresh();
  }

  protected async onOpenSettingsDialog(): Promise<void> {
    const tasksSettingsService: TasksSettingsService = await this.loadTasksSettingsService();

    tasksSettingsService.openDialog(this.tasksService.tasks())
      .pipe(
        take(1),
        switchMap((result: TaskImportRequest | undefined) => result ?
          this.taskImportService.importData(result)
            .pipe(
              take(1),
              switchMap((report: ImportReport) => report.status === 'success' ?
                this.tasksService.list()
                  .pipe(
                    take(1),
                    map(() => report),
                  ) :
                of(report),
              ),
            ) :
          of(undefined),
        ),
      )
      .subscribe({
        next: (report: ImportReport | undefined) => {
          if (!report) {
            return;
          }

          this.matSnackBar.open(
            this.formatImportReport(report),
            undefined,
            {
              duration: report.status === 'success' ? 7000 : 9000,
            },
          );
        },
      });
  }

  protected onTagsChange(tags: Tag[]): void {
    const field: ReturnType<typeof this.createTaskForm.tags> = this.createTaskForm.tags();
    field.value.set(tags);
    field.markAsDirty();
    field.markAsTouched({ skipDescendants: true });
  }

  protected isSameTag(tag1: Tag, tag2: Tag): boolean {
    return tag1.id === tag2.id;
  }

  protected onCreate(event?: Event): void {
    event?.preventDefault?.();

    if (!this.createTaskForm().valid()) {
      this.createTaskForm().markAsTouched();
      return;
    }

    const task: Task = new Task(this.createTaskFormModel() as Partial<Task>);

    this.tasksService.create(task)
      .pipe(take(1))
      .subscribe(() => this.resetForm());
  }

  private resetForm(): void {
    this.createTaskForm().reset({
      name: '',
      description: '',
      tags: [],
    });
  }

  private formatImportReport(
    report: ImportReport,
  ): string {
    if (report.status === 'blocked') {
      return report.errors.join(' ');
    }

    return this.buildImportReportSegments(report).join(', ') + '.';
  }

  private buildImportReportSegments(
    report: ImportReport,
  ): string[] {
    const segments: string[] = [
      this.formatCountSegment(report.createdTaskCount, 'Imported', 'task'),
      this.formatCountSegment(report.createdTimeLogCount, '', 'time log').trim(),
    ];

    if (report.warnings.length > 0) {
      segments.push(this.formatCountSegment(report.warnings.length, '', 'warning').trim());
    }

    if (report.createdTagCount > 0) {
      segments.push(this.formatCountSegment(report.createdTagCount, 'created', 'tag'));
    }

    return segments;
  }

  private formatCountSegment(
    count: number,
    prefix: string,
    noun: string,
  ): string {
    return `${ prefix ? `${ prefix } ` : '' }${ count } ${ noun }${ count === 1 ? '' : 's' }`;
  }
}
