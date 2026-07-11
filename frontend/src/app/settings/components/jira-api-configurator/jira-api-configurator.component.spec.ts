import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { vi } from 'vitest';

import { Setting } from '@core/models/setting.model';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import type { SettingsSaveEvent } from '@settings/interfaces/settings-save-event.interface';

import { JiraApiConfiguratorComponent } from './jira-api-configurator.component';

describe('Settings Components jira-api-configurator.component', () => {
  let fixture: ComponentFixture<JiraApiConfiguratorComponent>;
  let component: JiraApiConfiguratorComponent;

  const baseSettings: Setting[] = [
    new Setting({ id: '1', name: JiraApiSettings.enabled, value: 'true' }),
    new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://jira.example' }),
    new Setting({ id: '3', name: JiraApiSettings.personalAccessToken, value: 'stored-token' }),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JiraApiConfiguratorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(JiraApiConfiguratorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('settings', baseSettings);
    fixture.detectChanges();
  });

  it('renders JIRA API title and action buttons', () => {
    const title = fixture.debugElement.query(By.css('mat-card-title'))?.nativeElement as HTMLElement;
    const buttons = fixture.debugElement.queryAll(By.css('mat-card-actions button'));

    expect(title.textContent?.trim()).toBe('JIRA API');
    expect(buttons.map((button) => (button.nativeElement as HTMLButtonElement).textContent?.trim())).toEqual([
      'Cancel',
      'Save',
    ]);
  });

  it('patches initial settings and shows stored token hint', () => {
    const tokenHint = fixture.debugElement.query(By.css('mat-hint'))?.nativeElement as HTMLElement;

    expect((component as any).jiraApiFormModel()).toEqual({
      enabled: true,
      host: 'https://jira.example',
      personalAccessToken: '',
    });
    expect((component as any).hasStoredPersonalAccessToken()).toBe(true);
    expect(tokenHint.textContent).toContain('Token already configured');
  });

  it('toggles token visibility button state and input type', () => {
    const toggleButton = fixture.debugElement.query(By.css('button[mat-icon-button]')).nativeElement as HTMLButtonElement;
    const tokenInput = fixture.debugElement.query(By.css('input[autocomplete="off"]')).nativeElement as HTMLInputElement;

    expect(toggleButton.getAttribute('aria-label')).toBe('Show token');
    expect(tokenInput.getAttribute('type')).toBe('password');

    toggleButton.click();
    fixture.detectChanges();

    expect(toggleButton.getAttribute('aria-label')).toBe('Hide token');
    expect(tokenInput.getAttribute('type')).toBe('text');
  });

  it('disables and enables form via disabled input setter', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect((component as any).jiraApiForm().disabled()).toBe(true);

    fixture.componentRef.setInput('disabled', false);
    fixture.detectChanges();
    expect((component as any).jiraApiForm().disabled()).toBe(false);
  });

  it('marks controls as touched and does not emit when submitting invalid form', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    (component as any).jiraApiFormModel.update((value: { enabled: boolean; host: string; personalAccessToken: string }) => ({
      ...value,
      host: '',
    }));

    (component as any).onSaveFormData();

    expect((component as any).jiraApiForm().touched()).toBe(true);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('emits changed host setting when host value changes', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    (component as any).jiraApiFormModel.update((value: { enabled: boolean; host: string; personalAccessToken: string }) => ({
      ...value,
      host: 'https://jira.changed.local',
    }));

    (component as any).onSaveFormData();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy.mock.calls[0][0]).toEqual(expect.objectContaining({
      successMessage: 'Successfully saved JIRA API settings!',
      changedSettings: expect.arrayContaining([
        expect.objectContaining({
          id: '2',
          name: JiraApiSettings.host,
          value: 'https://jira.changed.local',
        }),
      ]),
    }));
  });

  it('does not emit token changes when jira is disabled and token is left empty', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    (component as any).jiraApiFormModel.set({
      enabled: false,
      host: 'https://jira.example',
      personalAccessToken: '',
    });

    (component as any).onSaveFormData();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy.mock.calls[0][0]).toEqual(expect.objectContaining({
      successMessage: 'Successfully saved JIRA API settings!',
      changedSettings: [
        expect.objectContaining({
          id: '1',
          name: JiraApiSettings.enabled,
          value: 'false',
        }),
      ],
    }));
  });

  it('resets form values back to persisted settings on cancel', () => {
    (component as any).jiraApiFormModel.set({
      enabled: false,
      host: 'modified-host',
      personalAccessToken: 'modified-token',
    });

    (component as any).onCancel();

    expect((component as any).jiraApiFormModel()).toEqual({
      enabled: true,
      host: 'https://jira.example',
      personalAccessToken: '',
    });
  });

  it('does not clear the stored token when jira is disabled and token field is blank', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    (component as any).jiraApiFormModel.set({
      enabled: false,
      host: 'https://jira.example',
      personalAccessToken: '   ',
    });

    (component as any).onSaveFormData();

    const [emittedEvent] = emitSpy.mock.calls[0];
    expect((emittedEvent as SettingsSaveEvent).successMessage).toBe('Successfully saved JIRA API settings!');
    expect((emittedEvent as SettingsSaveEvent).changedSettings).toEqual([
      expect.objectContaining({
        id: '1',
        name: JiraApiSettings.enabled,
        value: 'false',
      }),
    ]);
  });

  it('emits a non-empty replacement token', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    (component as any).jiraApiFormModel.update((value: { enabled: boolean; host: string; personalAccessToken: string }) => ({
      ...value,
      personalAccessToken: 'new-token',
    }));

    (component as any).onSaveFormData();

    const [emittedEvent] = emitSpy.mock.calls[0];
    expect((emittedEvent as SettingsSaveEvent).successMessage).toBe('Successfully saved JIRA API settings!');
    expect((emittedEvent as SettingsSaveEvent).changedSettings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: '3',
        name: JiraApiSettings.personalAccessToken,
        value: 'new-token',
      }),
    ]));
  });

  it('skips clearing blank tokens when no stored token exists', () => {
    fixture.componentRef.setInput('settings', [
      new Setting({ id: '1', name: JiraApiSettings.enabled, value: 'false' }),
      new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://jira.example' }),
    ]);
    fixture.detectChanges();

    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    (component as any).jiraApiFormModel.set({
      enabled: false,
      host: 'https://jira.example',
      personalAccessToken: '   ',
    });

    (component as any).onSaveFormData();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('skips clearing blank tokens while jira remains enabled', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    (component as any).jiraApiFormModel.set({
      enabled: true,
      host: 'https://jira.example',
      personalAccessToken: '   ',
    });

    (component as any).onSaveFormData();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('converts empty host values to invalid state and blocks save', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    (component as any).jiraApiFormModel.set({
      enabled: true,
      host: '',
      personalAccessToken: 'stored-token',
    });

    (component as any).onSaveFormData();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('requires a token when jira is enabled and no stored token exists', () => {
    fixture.componentRef.setInput('settings', [
      new Setting({ id: '1', name: JiraApiSettings.enabled, value: 'false' }),
      new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://jira.example' }),
    ]);
    fixture.detectChanges();

    expect((component as any).hasStoredPersonalAccessToken()).toBe(false);

    (component as any).onEnabledChange(true);
    fixture.detectChanges();

    expect((component as any).isTokenRequired()).toBe(true);
  });

  it('submits via form submit and handles cancel via button click', () => {
    const saveSpy = vi.spyOn(component as any, 'onSaveFormData');
    const cancelSpy = vi.spyOn(component as any, 'onCancel');

    const form = fixture.debugElement.query(By.css('form')).nativeElement as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const cancelButton = fixture.debugElement.query(By.css('button[aria-label="Cancel"]'))?.nativeElement as HTMLButtonElement;
    cancelButton.click();

    expect(saveSpy).toHaveBeenCalled();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('renders host and token validation errors through the template', () => {
    fixture.componentRef.setInput('settings', [
      new Setting({ id: '1', name: JiraApiSettings.enabled, value: 'false' }),
      new Setting({ id: '2', name: JiraApiSettings.host, value: '' }),
    ]);
    fixture.detectChanges();
    (component as any).onEnabledChange(true);
    (component as any).onSaveFormData();
    fixture.detectChanges();

    const errors = fixture.debugElement.queryAll(By.css('mat-error')).map((error) => error.nativeElement.textContent.trim());
    expect(errors).toContain('Host is required.');
    expect(errors).toContain('Token is required.');
    expect(fixture.debugElement.query(By.css('mat-hint'))).toBeFalsy();
  });

  it('handles slide-toggle changes and skips a valid no-op save', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    fixture.debugElement.query(By.css('mat-slide-toggle')).triggerEventHandler('change', { checked: false });
    fixture.detectChanges();
    expect((component as any).jiraApiFormModel().enabled).toBe(false);

    (component as any).onCancel();
    (component as any).onSaveFormData();
    expect(emitSpy).not.toHaveBeenCalled();
  });
});
