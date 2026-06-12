import { TestBed } from '@angular/core/testing';

import { vi } from 'vitest';

import { TasksSettingsToggleComponent } from './tasks-settings-toggle.component';

describe('Tasks Components tasks-settings-toggle.component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TasksSettingsToggleComponent],
    }).compileComponents();
  });

  it('emits openSettingsDialog when onOpenSettingsDialog is called', () => {
    const fixture = TestBed.createComponent(TasksSettingsToggleComponent);
    const component = fixture.componentInstance as unknown as {
      openSettingsDialog: { emit: () => void };
      onOpenSettingsDialog: () => void;
    };
    const emitSpy = vi.spyOn(component.openSettingsDialog, 'emit');

    component.onOpenSettingsDialog();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});
