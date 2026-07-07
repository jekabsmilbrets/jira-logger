import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { vi } from 'vitest';

import type { TaskImportRequest } from '@tasks/interfaces/import-report.interface';
import { TaskBackupService } from '@tasks/services/task-backup.service';

import { TasksSettingsDialogComponent } from './tasks-settings-dialog.component';

describe('Tasks Components tasks-settings-dialog.component', () => {
  const dialogRefMock = {
    close: vi.fn(),
  };

  const importRequest: TaskImportRequest = {
    tasks: [],
    warnings: [],
  };
  const taskBackupServiceMock = {
    exportTasksForUser: vi.fn(() => '{ "version": 2, "tasks": [] }'),
    parseTaskImportRequest: vi.fn(() => importRequest),
  };

  beforeEach(async () => {
    dialogRefMock.close.mockReset();
    taskBackupServiceMock.exportTasksForUser.mockClear();
    taskBackupServiceMock.parseTaskImportRequest.mockClear();

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
          provide: TaskBackupService,
          useValue: taskBackupServiceMock,
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
    component.tasksSettingsFormModel.set({
      json: '{"tasks":[]}',
    });

    await component.onImport();

    expect(taskBackupServiceMock.parseTaskImportRequest).toHaveBeenCalledWith('{"tasks":[]}');
    expect(dialogRefMock.close).toHaveBeenCalledTimes(1);
    expect(dialogRefMock.close).toHaveBeenCalledWith(importRequest);
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
    taskBackupServiceMock.parseTaskImportRequest.mockImplementationOnce(() => {
      throw new Error('Invalid task backup JSON.');
    });

    await component.onImport();
    fixture.detectChanges();

    expect(dialogRefMock.close).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Invalid task backup JSON.');
  });

  it('exports canonical backup JSON in preview and clipboard binding', async () => {
    const fixture = TestBed.createComponent(TasksSettingsDialogComponent);
    const component = fixture.componentInstance as any;
    component.showCurrent = true;
    await fixture.whenStable();
    fixture.detectChanges();

    const preview = fixture.debugElement.query(By.css('pre'));

    expect(taskBackupServiceMock.exportTasksForUser).toHaveBeenCalledWith([]);
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
