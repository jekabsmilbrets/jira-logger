import { COMMA, ENTER } from '@angular/cdk/keycodes';
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
import { type FieldTree, form, FormField, max, min, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { type MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { finalize, take } from 'rxjs';

import { TableComponent } from '@shared/components/table/table.component';
import type { Searchable } from '@shared/interfaces/searchable.interface';
import type { TableConfiguration } from '@shared/interfaces/table-configuration.interface';
import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import { DEFAULT_CRITERIA, EDIT_TAGS_ACTION, RESULT_COLUMNS, RESULT_LIMITS } from '@tasks/constants/jira-api-task-intake.constant';
import type {
  JiraApiTaskIntakeCriteria,
  JiraApiTaskIntakeOutcome,
  JiraApiTaskIntakeRow,
  JiraApiTaskIntakeSearchResult,
} from '@tasks/interfaces/jira-api-task-intake.interface';
import { JiraApiTaskIntakeService } from '@tasks/services/jira-api-task-intake.service';

@Component({
  selector: 'tasks-jira-task-import-dialog',
  templateUrl: './jira-task-import-dialog.component.html',
  styleUrls: ['./jira-task-import-dialog.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSnackBarModule,
    TableComponent,
  ],
  providers: [JiraApiTaskIntakeService],
})
export class JiraTaskImportDialogComponent {
  private readonly dialogRef: MatDialogRef<JiraTaskImportDialogComponent, boolean> = inject(MatDialogRef);
  private readonly matDialog: MatDialog = inject(MatDialog);
  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);
  private readonly tagsService: TagsService = inject(TagsService);
  private readonly intakeService: JiraApiTaskIntakeService = inject(JiraApiTaskIntakeService);

  protected readonly criteriaModel: WritableSignal<JiraApiTaskIntakeCriteria> = signal({ ...DEFAULT_CRITERIA });
  protected readonly criteriaForm: FieldTree<JiraApiTaskIntakeCriteria> = form(this.criteriaModel, (path) => {
    required(path.limit);
    min(path.limit, 50);
    max(path.limit, 200);
  });
  protected readonly resultLimits: number[] = RESULT_LIMITS;
  protected readonly separatorKeys: number[] = [ENTER, COMMA];
  protected readonly rows: WritableSignal<JiraApiTaskIntakeRow[]> = signal([]);
  protected readonly selectedIds: WritableSignal<Set<string>> = signal(new Set<string>());
  protected readonly truncated: WritableSignal<boolean> = signal(false);
  protected readonly resultLimit: WritableSignal<number> = signal(50);
  protected readonly isFetching: WritableSignal<boolean> = signal(false);
  protected readonly isImporting: WritableSignal<boolean> = signal(false);
  protected readonly tags: Signal<Tag[]> = this.tagsService.tags;
  protected readonly editingRow: WritableSignal<JiraApiTaskIntakeRow | null> = signal(null);
  protected readonly editingTags: WritableSignal<Tag[]> = signal([]);
  protected readonly tagEditorTemplate: Signal<TemplateRef<unknown> | undefined> = viewChild<TemplateRef<unknown>>('tagEditor');
  protected readonly selectedCount: Signal<number> = computed(() => this.selectedIds().size);
  protected readonly tableConfiguration: Signal<TableConfiguration> = computed(() => ({
    columns: RESULT_COLUMNS,
    data: this.rows(),
    rowActions: [EDIT_TAGS_ACTION],
    selectedIds: [...this.selectedIds()],
    selectable: true,
    sort: {
      field: 'updated',
      direction: 'desc',
    },
  }));
  protected readonly hasEffectiveCriteria: Signal<boolean> = computed(() => {
    const criteria: JiraApiTaskIntakeCriteria = this.criteriaModel();

    return criteria.assignedToMe
      || criteria.reportedByMe
      || criteria.resolution !== 'all'
      || criteria.projects.length > 0;
  });

  public constructor() {
    this.intakeService.restoreCriteria(this.criteriaModel);
  }

  protected addProject(
    event: MatChipInputEvent,
  ): void {
    const project: string = event.value.trim().toUpperCase();
    event.chipInput.clear();

    if (!/^[A-Z][A-Z0-9_]{1,9}$/.test(project)) {
      return;
    }

    this.criteriaModel.update((criteria: JiraApiTaskIntakeCriteria) => ({
      ...criteria,
      projects: [...new Set([...criteria.projects, project])],
    }));
  }

  protected removeProject(
    project: string,
  ): void {
    this.criteriaModel.update((criteria: JiraApiTaskIntakeCriteria) => ({
      ...criteria,
      projects: criteria.projects.filter((key: string) => key !== project),
    }));
  }

  protected fetch(): void {
    if (
      !this.hasEffectiveCriteria() ||
      this.criteriaForm().invalid() ||
      this.isFetching()
    ) {
      return;
    }

    const criteria: JiraApiTaskIntakeCriteria = this.criteriaModel();
    this.rows.set([]);
    this.selectedIds.set(new Set<string>());
    this.truncated.set(false);
    this.resultLimit.set(criteria.limit);
    this.isFetching.set(true);
    this.intakeService.findCandidates(criteria)
      .pipe(
        take(1),
        finalize(() => this.isFetching.set(false)),
      )
      .subscribe((result: JiraApiTaskIntakeSearchResult) => {
        this.rows.set(result.rows);
        this.selectedIds.set(new Set<string>());
        this.truncated.set(result.meta.truncated);
        this.resultLimit.set(result.meta.limit);
      });
  }

  protected onSelectionChange(
    rows: Searchable[],
  ): void {
    this.selectedIds.set(new Set(rows.map((row: Searchable) => row.id)));
  }

  protected onRowAction(
    [
      row,
      actionId,
    ]: [
      Searchable,
      string
    ],
  ): void {
    if (actionId !== EDIT_TAGS_ACTION.id) {
      return;
    }

    const template: TemplateRef<unknown> | undefined = this.tagEditorTemplate();
    if (!template) {
      return;
    }

    const jiraRow: JiraApiTaskIntakeRow = row as JiraApiTaskIntakeRow;
    const originalTags: Tag[] = [...jiraRow.tags];
    this.editingRow.set(jiraRow);
    this.editingTags.set(originalTags);
    this.matDialog.open<unknown, undefined, unknown>(template)
      .afterClosed()
      .pipe(take(1))
      .subscribe((selectedTags: unknown) => {
        if (!Array.isArray(selectedTags)) {
          this.editingTags.set(originalTags);
          return;
        }

        this.updateRow(jiraRow.key, (currentRow: JiraApiTaskIntakeRow) => ({
          ...currentRow,
          tags: [...selectedTags] as Tag[],
        }));
      });
  }

  protected isSameTag(
    left: Tag,
    right: Tag,
  ): boolean {
    return left.id === right.id;
  }

  protected importSelected(): void {
    const selectedIds: Set<string> = this.selectedIds();
    const selectedRows: JiraApiTaskIntakeRow[] = this.rows()
      .filter((row: JiraApiTaskIntakeRow) => selectedIds.has(row.id));
    if (selectedRows.length === 0 || this.isImporting()) {
      return;
    }

    this.isImporting.set(true);
    this.intakeService.createTasks(selectedRows)
      .pipe(
        take(1),
        finalize(() => this.isImporting.set(false)),
      )
      .subscribe((outcome: JiraApiTaskIntakeOutcome) => this.handleImportOutcome(outcome));
  }

  protected close(): void {
    this.dialogRef.close();
  }

  private updateRow(
    key: string,
    update: (row: JiraApiTaskIntakeRow) => JiraApiTaskIntakeRow,
  ): void {
    this.rows.update((rows: JiraApiTaskIntakeRow[]) => rows.map(
      (row: JiraApiTaskIntakeRow) => row.key === key ? update(row) : row,
    ));
  }

  private handleImportOutcome(
    outcome: JiraApiTaskIntakeOutcome,
  ): void {
    if (outcome.status === 'successful') {
      this.matSnackBar.open(
        `Imported ${ outcome.createdCount } Jira ${ outcome.createdCount === 1 ? 'task' : 'tasks' }.`,
        undefined,
        { duration: 5000 },
      );
      this.dialogRef.close(true);
      return;
    }

    this.rows.set(outcome.failedCandidates);
    this.selectedIds.set(new Set(outcome.failedCandidates.map((candidate: JiraApiTaskIntakeRow) => candidate.key)));
    this.matSnackBar.open(
      `Imported ${ outcome.createdCount }; ${ outcome.failedCandidates.length } failed. Failed tasks remain selected.`,
      undefined,
      { duration: 7000 },
    );
  }
}
