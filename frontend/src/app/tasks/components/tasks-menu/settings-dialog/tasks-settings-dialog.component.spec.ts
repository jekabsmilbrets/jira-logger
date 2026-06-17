import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { vi } from 'vitest';

import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';
import { TagsService } from '@shared/services/tags.service';

import { TasksSettingsDialogComponent } from './tasks-settings-dialog.component';

describe('Tasks Components tasks-settings-dialog.component', () => {
  const dialogRefMock = {
    close: vi.fn(),
  };

  const tagsServiceMock = {
    tags: signal<Tag[]>([]).asReadonly(),
  };

  beforeEach(async () => {
    dialogRefMock.close.mockReset();

    await TestBed.configureTestingModule({
      imports: [TasksSettingsDialogComponent],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            currentTasks: [],
          },
        },
        {
          provide: MatDialogRef,
          useValue: dialogRefMock,
        },
        {
          provide: TagsService,
          useValue: tagsServiceMock,
        },
      ],
    }).compileComponents();
  });

  it('closes dialog without payload on onClose', () => {
    const fixture = TestBed.createComponent(TasksSettingsDialogComponent);
    const component = fixture.componentInstance as unknown as { onClose: () => void };

    component.onClose();

    expect(dialogRefMock.close).toHaveBeenCalledTimes(1);
    expect(dialogRefMock.close).toHaveBeenCalledWith();
  });

  it('does not import when form is invalid', () => {
    const fixture = TestBed.createComponent(TasksSettingsDialogComponent);
    const component = fixture.componentInstance as unknown as {
      onImport: () => Promise<void>;
      tasksSettingsFormModel: { set: (value: { json: string }) => void };
    };

    component.tasksSettingsFormModel.set({ json: '' });
    void component.onImport();

    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });

  it('validates JSON and closes with imported tasks on valid input', async () => {
    const fixture = TestBed.createComponent(TasksSettingsDialogComponent);
    const component = fixture.componentInstance as unknown as {
      onImport: () => Promise<void>;
      tasksSettingsFormModel: { set: (value: { json: string }) => void };
    };
    const tag = new Tag({ id: '1', name: 'Frontend' });

    tagsServiceMock.tags = signal([tag]).asReadonly();

    component.tasksSettingsFormModel.set({
      json: JSON.stringify([
        {
          _name: 'Imported task',
          _description: 'Imported',
          _timeLogs: [],
          _tags: [{ _id: '1' }],
        },
      ]),
    });

    await component.onImport();

    expect(dialogRefMock.close).toHaveBeenCalledTimes(1);
    expect(dialogRefMock.close).toHaveBeenCalledWith({
      tasks: [
        {
          name: 'Imported task',
          description: 'Imported',
          timeLogs: [],
          tags: ['Frontend'],
          unsupportedMetadata: {
            task: undefined,
            timeLogs: undefined,
            tags: [{ id: '1', createdAt: undefined, updatedAt: undefined }],
            lastTimeLog: undefined,
            jiraWorkLogs: undefined,
            timeLogged: undefined,
          },
        },
      ],
      warnings: [
        {
          code: 'unsupported-metadata',
          taskName: 'Imported task',
          fields: ['source tag metadata'],
          message: 'Task "Imported task" contains backup-only metadata: source tag metadata.',
          metadata: {
            task: undefined,
            timeLogs: undefined,
            tags: [{ id: '1', createdAt: undefined, updatedAt: undefined }],
            lastTimeLog: undefined,
            jiraWorkLogs: undefined,
            timeLogged: undefined,
          },
        },
      ],
    });
  });

  it('shows inline error and does not close when JSON is invalid', async () => {
    const fixture = TestBed.createComponent(TasksSettingsDialogComponent);
    const component = fixture.componentInstance as unknown as {
      onImport: () => Promise<void>;
      tasksSettingsFormModel: { set: (value: { json: string }) => void };
    };

    component.tasksSettingsFormModel.set({
      json: '{invalid json}',
    });

    await component.onImport();
    fixture.detectChanges();

    expect(dialogRefMock.close).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('JSON');
  });

  it('exports canonical backup JSON in preview and clipboard binding', async () => {
    const fixture = TestBed.createComponent(TasksSettingsDialogComponent);
    const component = fixture.componentInstance as any;
    component.showCurrent = true;
    await fixture.whenStable();
    fixture.detectChanges();

    const preview = fixture.debugElement.query(By.css('pre'));

    expect(preview.nativeElement.textContent).toContain('"version": 2');
    expect(component.currentBackupJson()).toContain('"tasks"');
  });

  it('toggles current JSON preview and handles close/import button clicks from template', () => {
    const fixture = TestBed.createComponent(TasksSettingsDialogComponent);
    const component = fixture.componentInstance as any;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('pre'))).toBeFalsy();

    const toggleEl = fixture.debugElement.query(By.css('mat-slide-toggle'));
    toggleEl.triggerEventHandler('toggleChange', {});
    fixture.detectChanges();

    expect(component.showCurrent).toBe(true);
    expect(fixture.debugElement.query(By.css('pre'))).toBeTruthy();

    const closeSpy = vi.spyOn(component, 'onClose');
    const importSpy = vi.spyOn(component, 'onImport').mockResolvedValue(undefined);

    const buttons = fixture.debugElement.queryAll(By.css('button[mat-button]'));
    buttons.find((btn) => btn.nativeElement.textContent.includes('Close'))?.nativeElement.click();
    buttons.find((btn) => btn.nativeElement.textContent.includes('Import'))?.nativeElement.click();

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(importSpy).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when title close icon is clicked', () => {
    const fixture = TestBed.createComponent(TasksSettingsDialogComponent);
    const component = fixture.componentInstance as any;
    const closeSpy = vi.spyOn(component, 'onClose');
    fixture.detectChanges();

    const titleClose = fixture.debugElement.query(By.css('button[aria-label="close dialog"]'));
    titleClose.nativeElement.click();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
