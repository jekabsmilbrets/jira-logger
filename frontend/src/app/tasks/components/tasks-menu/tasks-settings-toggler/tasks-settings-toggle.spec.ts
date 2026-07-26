import { TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';

import { vi } from 'vitest';

import { TasksSettingsToggle } from './tasks-settings-toggle';

describe('Tasks Components tasks-settings-toggle', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TasksSettingsToggle],
    }).compileComponents();
  });

  it('emits openSettingsDialog when onOpenSettingsDialog is called', () => {
    const fixture = TestBed.createComponent(TasksSettingsToggle);
    const component = fixture.componentInstance as unknown as {
      openSettingsDialog: { emit: () => void };
      onOpenSettingsDialog: () => void;
    };
    const emitSpy = vi.spyOn(component.openSettingsDialog, 'emit');

    component.onOpenSettingsDialog();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('adds tooltip for Import JSON Backup', () => {
    const fixture = TestBed.createComponent(TasksSettingsToggle);

    fixture.detectChanges();

    const buttonDebugElement = fixture.debugElement.query(By.css('button[aria-label="Open Tasks Settings"]'));
    const tooltip = buttonDebugElement.injector.get(MatTooltip);

    expect(tooltip.message).toBe('Import JSON Backup');
  });
});
