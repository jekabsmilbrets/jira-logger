import { ComponentFixture, TestBed } from '@angular/core/testing';

import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { Setting } from '@core/models/setting.model';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import { vi } from 'vitest';

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
      providers: [provideNoopAnimations()],
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

    expect(formGroup.controls[JiraApiSettings.enabled].value).toBe(true);
    expect(formGroup.controls[JiraApiSettings.host].value).toBe('https://jira.example');
    expect(formGroup.controls[JiraApiSettings.personalAccessToken].value).toBe('');
    expect(tokenHint.textContent).toContain('Token already configured');
  });

  it('toggles token visibility button state and input type', () => {
    const toggleButton = fixture.debugElement.query(By.css('button[mat-icon-button]')).nativeElement as HTMLButtonElement;
    const tokenInput = fixture.debugElement.query(By.css('input[formControlName="jira.personal-access-token"]')).nativeElement as HTMLInputElement;

    expect(toggleButton.getAttribute('aria-label')).toBe('Show token');
    expect(tokenInput.getAttribute('type')).toBe('password');

    toggleButton.click();
    fixture.detectChanges();

    expect(toggleButton.getAttribute('aria-label')).toBe('Hide token');
    expect(tokenInput.getAttribute('type')).toBe('text');
  });

  it('disables and enables form via disabled input setter', () => {
    component.disabled = true;
    expect((component as any).formGroup.controls[JiraApiSettings.host].disabled).toBe(true);

    component.disabled = false;
    expect((component as any).formGroup.controls[JiraApiSettings.host].enabled).toBe(true);
  });

  it('marks controls as touched and does not emit when submitting invalid form', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const formGroup = (component as any).formGroup;

    formGroup.controls[JiraApiSettings.host].setValue('');
    formGroup.controls[JiraApiSettings.host].markAsDirty();

    (component as any).onSaveFormData();

    expect(formGroup.touched).toBe(true);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('emits changed settings when host value changes', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const formGroup = (component as any).formGroup;

    formGroup.controls[JiraApiSettings.host].setValue('https://jira.changed.local');

    (component as any).onSaveFormData();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const emitted = emitSpy.mock.calls[0][0] as Setting[];
    expect(emitted).toHaveLength(1);
    expect(emitted[0].name).toBe(JiraApiSettings.host);
    expect(emitted[0].value).toBe('https://jira.changed.local');
  });

  it('clears stored token when jira is disabled and token is left empty', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const formGroup = (component as any).formGroup;

    formGroup.controls[JiraApiSettings.enabled].setValue(false);
    formGroup.controls[JiraApiSettings.personalAccessToken].setValue('');

    (component as any).onSaveFormData();

    const emitted = emitSpy.mock.calls[0][0] as Setting[];
    const tokenSetting = emitted.find((setting) => setting.name === JiraApiSettings.personalAccessToken);

    expect(tokenSetting?.value).toBe('');
    expect(emitted.some((setting) => setting.name === JiraApiSettings.enabled && setting.value === false)).toBe(true);
  });

  it('resets form values back to persisted settings on cancel', () => {
    const formGroup = (component as any).formGroup;

    formGroup.controls[JiraApiSettings.host].setValue('modified-host');
    expect(formGroup.controls[JiraApiSettings.host].value).toBe('modified-host');

    (component as any).onCancel();

    expect(formGroup.controls[JiraApiSettings.host].value).toBe('https://jira.example');
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
