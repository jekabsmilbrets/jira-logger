import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField } from '@angular/forms/signals';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';

import { of, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import { DEFAULT_CRITERIA } from '@tasks/constants/jira-api-task-intake.constant';
import type {
  JiraApiTaskIntakeOutcome,
  JiraApiTaskIntakeRow,
  JiraApiTaskIntakeSearchResult,
} from '@tasks/interfaces/jira-api-task-intake.interface';
import { JiraApiTaskIntakeService } from '@tasks/services/jira-api-task-intake.service';

import { JiraTaskImportDialogComponent } from './jira-task-import-dialog.component';

describe('JiraTaskImportDialogComponent', () => {
  const opex = new Tag({ id: 'opex-id', name: 'OPEX' });
  const capex = new Tag({ id: 'capex-id', name: 'capex' });
  const tags = signal<Tag[]>([opex, capex]);
  const rows: JiraApiTaskIntakeRow[] = [
    buildRow('ABC-1', 'Bug', [opex], new Date('2026-07-25T12:30:00+03:00')),
    buildRow('ABC-2', 'Task', [capex], null),
  ];
  const searchResult: JiraApiTaskIntakeSearchResult = {
    rows,
    meta: { limit: 50, truncated: true },
  };
  const intakeService = {
    restoreCriteria: vi.fn(),
    findCandidates: vi.fn(),
    createTasks: vi.fn(),
  };
  const dialogRef = {
    close: vi.fn(),
  };
  const matDialog = {
    open: vi.fn(),
  };
  const snackBar = {
    open: vi.fn(),
  };

  beforeEach(async () => {
    intakeService.restoreCriteria.mockReset().mockImplementation((criteriaModel) => {
      criteriaModel.set({ ...DEFAULT_CRITERIA });
    });
    intakeService.findCandidates.mockReset().mockReturnValue(of(searchResult));
    intakeService.createTasks.mockReset();
    dialogRef.close.mockReset();
    matDialog.open.mockReset().mockReturnValue({ afterClosed: () => of(undefined) });
    snackBar.open.mockReset();
    tags.set([opex, capex]);

    TestBed.configureTestingModule({
      imports: [JiraTaskImportDialogComponent],
      providers: [
        { provide: TagsService, useValue: { tags: tags.asReadonly() } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    TestBed.overrideComponent(JiraTaskImportDialogComponent, {
      set: {
        providers: [{ provide: JiraApiTaskIntakeService, useValue: intakeService }],
      },
    });
    TestBed.overrideProvider(MatDialog, { useValue: matDialog });
    await TestBed.compileComponents();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('restores criteria through the intake module and disables an ineffective search', async () => {
    const fixture = TestBed.createComponent(JiraTaskImportDialogComponent);
    await fixture.whenStable();

    expect(intakeService.restoreCriteria).toHaveBeenCalledWith(fixture.componentInstance['criteriaModel']);

    fixture.componentInstance['criteriaModel'].set({
      assignedToMe: false,
      reportedByMe: false,
      resolution: 'all',
      projects: [],
      limit: 50,
    });

    expect(fixture.componentInstance['hasEffectiveCriteria']()).toBe(false);
  });

  it('renders Material criteria with the supported limits', async () => {
    const fixture = TestBed.createComponent(JiraTaskImportDialogComponent);
    await fixture.whenStable();

    expect(fixture.debugElement.queryAll(By.css('mat-checkbox'))).toHaveLength(2);
    expect(fixture.debugElement.queryAll(By.css('mat-select'))).toHaveLength(2);
    expect(fixture.debugElement.queryAll(By.directive(FormField))).toHaveLength(4);
    expect(fixture.componentInstance['resultLimits']).toEqual([50, 100, 150, 200]);

    fixture.debugElement.queryAll(By.directive(MatCheckbox))[0].componentInstance.toggle();
    expect(fixture.componentInstance['criteriaModel']().assignedToMe).toBe(false);
  });

  it('loads unselected sortable candidates and shows truncation', async () => {
    const fixture = TestBed.createComponent(JiraTaskImportDialogComponent);
    await fixture.whenStable();

    fixture.componentInstance['fetch']();

    expect(intakeService.findCandidates).toHaveBeenCalledWith(DEFAULT_CRITERIA);
    expect(fixture.componentInstance['rows']()).toEqual(rows);
    expect(fixture.componentInstance['selectedIds']().size).toBe(0);
    expect(fixture.componentInstance['truncated']()).toBe(true);
    expect(fixture.componentInstance['resultLimit']()).toBe(50);
    expect(fixture.componentInstance['tableConfiguration']().columns.map((column) => column.columnDef))
      .toEqual(['key', 'intakeStatus', 'summary', 'status', 'issueType', 'updated']);
    expect(fixture.componentInstance['tableConfiguration']().sort).toEqual({
      field: 'updated',
      direction: 'desc',
    });
  });

  it('clears stale candidates, selection, and failures immediately when searching again', async () => {
    const fixture = TestBed.createComponent(JiraTaskImportDialogComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;

    component['fetch']();
    component['rows'].set([{ ...rows[0], intakeStatus: 'Import failed' }]);
    component['onSelectionChange'](component['rows']());

    const pendingResult = new Subject<JiraApiTaskIntakeSearchResult>();
    intakeService.findCandidates.mockReturnValueOnce(pendingResult);
    component['fetch']();

    expect(component['rows']()).toEqual([]);
    expect(component['selectedIds']().size).toBe(0);
    expect(component['truncated']()).toBe(false);
    expect(component['isFetching']()).toBe(true);

    pendingResult.complete();
  });

  it('tracks table selection and keeps Tag dialog changes independent', async () => {
    const fixture = TestBed.createComponent(JiraTaskImportDialogComponent);
    await fixture.whenStable();
    fixture.componentInstance['fetch']();
    const currentRows = fixture.componentInstance['rows']();
    matDialog.open.mockReturnValueOnce({ afterClosed: () => of([]) });

    fixture.componentInstance['onSelectionChange'](currentRows);
    fixture.componentInstance['onRowAction']([currentRows[0], 'edit-tags']);

    expect(fixture.componentInstance['selectedIds']()).toEqual(new Set(['ABC-1', 'ABC-2']));
    expect(fixture.componentInstance['rows']()[0].tags).toEqual([]);
    expect(fixture.componentInstance['rows']()[1].tags).toEqual([capex]);
    expect(fixture.componentInstance['tableConfiguration']().rowActions?.[0].cell?.(
      fixture.componentInstance['rows']()[0],
    )).toBe('No tags');
  });

  it('does not change Tags when the Tag dialog is cancelled', async () => {
    const fixture = TestBed.createComponent(JiraTaskImportDialogComponent);
    await fixture.whenStable();
    fixture.componentInstance['fetch']();
    const row = fixture.componentInstance['rows']()[0];
    const cancelled = new Subject<unknown>();
    matDialog.open.mockReturnValueOnce({ afterClosed: () => cancelled });

    fixture.componentInstance['onSelectionChange']([row]);
    fixture.componentInstance['onRowAction']([row, 'edit-tags']);
    fixture.componentInstance['editingTags'].set([]);
    cancelled.next('cancelled');

    expect(fixture.componentInstance['rows']()[0].tags).toEqual([opex]);
    expect(fixture.componentInstance['editingTags']()).toEqual([opex]);
    expect(fixture.componentInstance['selectedIds']()).toEqual(new Set(['ABC-1']));
  });

  it('shows failed candidates, allows Tag edits, retries, and closes after success', async () => {
    const fixture = TestBed.createComponent(JiraTaskImportDialogComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component['fetch']();
    component['onSelectionChange'](component['rows']());
    const failedCandidate = { ...rows[1], intakeStatus: 'Import failed' as const };
    const partialOutcome: JiraApiTaskIntakeOutcome = {
      status: 'partial',
      createdCount: 1,
      failedCandidates: [failedCandidate],
    };
    intakeService.createTasks.mockReturnValueOnce(of(partialOutcome));

    component['importSelected']();
    await fixture.whenStable();

    expect(component['rows']()).toEqual([failedCandidate]);
    expect(component['selectedIds']()).toEqual(new Set(['ABC-2']));
    expect(fixture.nativeElement.textContent).toContain('Import failed');
    expect(dialogRef.close).not.toHaveBeenCalled();

    matDialog.open.mockReturnValueOnce({ afterClosed: () => of([opex]) });
    component['onRowAction']([failedCandidate, 'edit-tags']);
    intakeService.createTasks.mockReturnValueOnce(of({
      status: 'successful',
      createdCount: 1,
      failedCandidates: [],
    }));
    component['importSelected']();

    expect(intakeService.createTasks).toHaveBeenLastCalledWith([
      expect.objectContaining({ key: 'ABC-2', tags: [opex], intakeStatus: 'Import failed' }),
    ]);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});

const buildRow = (
  key: string,
  issueType: string,
  rowTags: Tag[],
  updated: Date | null,
): JiraApiTaskIntakeRow => ({
  id: key,
  key,
  summary: key,
  status: 'Open',
  issueType,
  updated,
  tags: rowTags,
  intakeStatus: '',
});
