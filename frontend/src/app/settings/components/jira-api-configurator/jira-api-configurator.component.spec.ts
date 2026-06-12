import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { vi } from 'vitest';

import { Setting } from '@core/models/setting.model';

import { JiraApiSettings, JiraApiSettingSlugs } from '@settings/enums/jira-api-settings.enum';

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
    const formGroup = (component as any).formGroup;
    const tokenHint = fixture.debugElement.query(By.css('mat-hint'))?.nativeElement as HTMLElement;

    expect(formGroup.controls[JiraApiSettingSlugs.enabled].value).toBe(true);
    expect(formGroup.controls[JiraApiSettingSlugs.host].value).toBe('https://jira.example');
    expect(formGroup.controls[JiraApiSettingSlugs.personalAccessToken].value).toBe('');
    expect(tokenHint.textContent).toContain('Token already configured');
  });

  it('toggles token visibility button state and input type', () => {
    const toggleButton = fixture.debugElement.query(By.css('button[mat-icon-button]')).nativeElement as HTMLButtonElement;
    const tokenInput = fixture.debugElement.query(By.css('input[formControlName="jira-personal-access-token"]')).nativeElement as HTMLInputElement;

    expect(toggleButton.getAttribute('aria-label')).toBe('Show token');
    expect(tokenInput.getAttribute('type')).toBe('password');

    toggleButton.click();
    fixture.detectChanges();

    expect(toggleButton.getAttribute('aria-label')).toBe('Hide token');
    expect(tokenInput.getAttribute('type')).toBe('text');
  });

  it('disables and enables form via disabled input setter', () => {
    component.disabled = true;
    expect((component as any).formGroup.controls[JiraApiSettingSlugs.host].disabled).toBe(true);

    component.disabled = false;
    expect((component as any).formGroup.controls[JiraApiSettingSlugs.host].enabled).toBe(true);
  });

  it('marks controls as touched and does not emit when submitting invalid form', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const formGroup = (component as any).formGroup;

    formGroup.controls[JiraApiSettingSlugs.host].setValue('');
    formGroup.controls[JiraApiSettingSlugs.host].markAsDirty();

    (component as any).onSaveFormData();

    expect(formGroup.touched).toBe(true);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('does not emit changed settings when host value changes', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const formGroup = (component as any).formGroup;

    formGroup.controls[JiraApiSettingSlugs.host].setValue('https://jira.changed.local');

    (component as any).onSaveFormData();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('does not emit token changes when jira is disabled and token is left empty', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const formGroup = (component as any).formGroup;

    formGroup.controls[JiraApiSettingSlugs.enabled].setValue(false);
    formGroup.controls[JiraApiSettingSlugs.personalAccessToken].setValue('');

    (component as any).onSaveFormData();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('resets form values back to persisted settings on cancel', () => {
    const formGroup = (component as any).formGroup;

    formGroup.controls[JiraApiSettingSlugs.host].setValue('modified-host');
    expect(formGroup.controls[JiraApiSettingSlugs.host].value).toBe('modified-host');

    (component as any).onCancel();

    expect(formGroup.controls[JiraApiSettingSlugs.host].value).toBe('https://jira.example');
  });

  it('emits a cleared token when save data uses jira setting keys', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const formGroup = (component as any).formGroup;
    vi.spyOn(formGroup, 'getRawValue').mockReturnValue({
      [JiraApiSettings.enabled]: false,
      [JiraApiSettings.host]: 'https://jira.example',
      [JiraApiSettings.personalAccessToken]: '   ',
    });

    formGroup.controls[JiraApiSettingSlugs.enabled].setValue(false);

    (component as any).onSaveFormData();

    const [emittedSettings] = emitSpy.mock.calls[0];
    expect(emittedSettings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: '1',
        name: JiraApiSettings.enabled,
        value: 'false',
      }),
      expect.objectContaining({
        id: '3',
        name: JiraApiSettings.personalAccessToken,
        value: '',
      }),
    ]));
  });

  it('emits a non-empty replacement token when save data uses jira setting keys', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const formGroup = (component as any).formGroup;
    vi.spyOn(formGroup, 'getRawValue').mockReturnValue({
      [JiraApiSettings.enabled]: true,
      [JiraApiSettings.host]: 'https://jira.example',
      [JiraApiSettings.personalAccessToken]: 'new-token',
    });

    (component as any).onSaveFormData();

    const [emittedSettings] = emitSpy.mock.calls[0];
    expect(emittedSettings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: '3',
        name: JiraApiSettings.personalAccessToken,
        value: 'new-token',
      }),
    ]));
  });

  it('ignores null token values during save when save data uses jira setting keys', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const formGroup = (component as any).formGroup;
    vi.spyOn(formGroup, 'getRawValue').mockReturnValue({
      [JiraApiSettings.enabled]: true,
      [JiraApiSettings.host]: 'https://jira.example',
      [JiraApiSettings.personalAccessToken]: null,
    });

    (component as any).onSaveFormData();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('skips clearing blank tokens when no stored token exists', () => {
    fixture.componentRef.setInput('settings', [
      new Setting({ id: '1', name: JiraApiSettings.enabled, value: 'false' }),
      new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://jira.example' }),
    ]);
    (component as any).onCancel();

    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const formGroup = (component as any).formGroup;
    vi.spyOn(formGroup, 'getRawValue').mockReturnValue({
      [JiraApiSettings.enabled]: false,
      [JiraApiSettings.host]: 'https://jira.example',
      [JiraApiSettings.personalAccessToken]: '   ',
    });

    (component as any).onSaveFormData();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('skips clearing blank tokens while jira remains enabled', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const formGroup = (component as any).formGroup;
    vi.spyOn(formGroup, 'getRawValue').mockReturnValue({
      [JiraApiSettings.enabled]: true,
      [JiraApiSettings.host]: 'https://jira.example',
      [JiraApiSettings.personalAccessToken]: '   ',
    });

    (component as any).onSaveFormData();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('converts null non-token values to empty strings during save', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const formGroup = (component as any).formGroup;
    vi.spyOn(formGroup, 'getRawValue').mockReturnValue({
      [JiraApiSettings.enabled]: true,
      [JiraApiSettings.host]: null,
      [JiraApiSettings.personalAccessToken]: 'stored-token',
    });

    (component as any).onSaveFormData();

    const [emittedSettings] = emitSpy.mock.calls[0];
    expect(emittedSettings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: '2',
        name: JiraApiSettings.host,
        value: '',
      }),
    ]));
  });

  it('requires a token when jira is enabled and no stored token exists', () => {
    fixture.componentRef.setInput('settings', [
      new Setting({ id: '1', name: JiraApiSettings.enabled, value: 'false' }),
      new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://jira.example' }),
    ]);
    (component as any).onCancel();

    const formGroup = (component as any).formGroup;
    const tokenControl = formGroup.controls[JiraApiSettingSlugs.personalAccessToken];

    expect((component as any).hasStoredPersonalAccessToken).toBe(false);
    expect(tokenControl.hasValidator(Validators.required)).toBe(false);

    formGroup.controls[JiraApiSettingSlugs.enabled].setValue(true);

    expect(tokenControl.hasValidator(Validators.required)).toBe(true);
  });

  it('returns defaults when settings input is not an array', () => {
    const settingsSignal = vi.fn(() => undefined);
    (component as any).settings = settingsSignal;

    expect((component as any).getSetting(JiraApiSettings.host)).toBeUndefined();
    expect((component as any).getSettingValue(JiraApiSettings.host, 'fallback-host')).toBe('fallback-host');
    expect((component as any).getSettingValue(JiraApiSettings.enabled, false)).toBe(false);
  });

  it('normalizes stored boolean-like and boolean values through getSettingValue', () => {
    const settingsSignal = vi.fn(() => [
      new Setting({ id: '1', name: JiraApiSettings.enabled, value: 'FALSE' as unknown as string }),
      new Setting({ id: '2', name: JiraApiSettings.host, value: true as unknown as string }),
    ]);
    (component as any).settings = settingsSignal;

    expect((component as any).getSettingValue(JiraApiSettings.enabled, true)).toBe(false);
    expect((component as any).getSettingValue(JiraApiSettings.host, '')).toBe(true);
  });

  it('falls back to defaults when a setting value is neither string nor boolean', () => {
    const settingsSignal = vi.fn(() => [
      new Setting({ id: '1', name: JiraApiSettings.host, value: 123 as unknown as string }),
    ]);
    (component as any).settings = settingsSignal;

    expect((component as any).getSettingValue(JiraApiSettings.host, 'fallback-host')).toBe('fallback-host');
  });

  it('submits via form ngSubmit and handles cancel via button click', () => {
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
});
