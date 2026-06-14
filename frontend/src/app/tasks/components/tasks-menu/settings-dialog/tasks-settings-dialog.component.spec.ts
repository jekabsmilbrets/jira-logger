import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';

import { vi } from 'vitest';

import { Tag } from '@shared/models/tag.model';
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
      onImport: () => void;
      tasksSettingsFormModel: { set: (value: { json: string }) => void };
    };

    component.tasksSettingsFormModel.set({ json: '' });
    component.onImport();

    expect(dialogRefMock.close).not.toHaveBeenCalled();
  });

  it('validates JSON and closes with imported tasks on valid input', () => {
    const fixture = TestBed.createComponent(TasksSettingsDialogComponent);
    const component = fixture.componentInstance as unknown as {
      onImport: () => void;
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

    component.onImport();

    expect(dialogRefMock.close).toHaveBeenCalledTimes(1);
    expect(dialogRefMock.close).toHaveBeenCalledWith([
      {
        name: 'Imported task',
        description: 'Imported',
        timeLogs: [],
        tags: [{ id: '1', name: 'Frontend' }],
      },
    ]);
  });

  it('logs error and does not close when JSON is invalid', () => {
    const fixture = TestBed.createComponent(TasksSettingsDialogComponent);
    const component = fixture.componentInstance as unknown as {
      onImport: () => void;
      tasksSettingsFormModel: { set: (value: { json: string }) => void };
    };
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    component.tasksSettingsFormModel.set({
      json: '{invalid json}',
    });

    component.onImport();

    expect(dialogRefMock.close).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
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
    const importSpy = vi.spyOn(component, 'onImport');

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
