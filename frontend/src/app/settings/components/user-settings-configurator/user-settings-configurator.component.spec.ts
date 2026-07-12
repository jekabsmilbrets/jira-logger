import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { vi } from 'vitest';

import { Setting } from '@core/models/setting.model';

import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';
import type { SettingsSaveEvent } from '@settings/interfaces/settings-save-event.interface';

import { UserSettingsConfiguratorComponent } from './user-settings-configurator.component';

describe('Settings Components user-settings-configurator.component', () => {
  let fixture: ComponentFixture<UserSettingsConfiguratorComponent>;
  let component: UserSettingsConfiguratorComponent;

  const baseSettings: Setting[] = [
    new Setting({ id: '4', name: JiraUserSettings.userTimeZone, value: 'Europe/Riga' }),
    new Setting({ id: '5', name: JiraUserSettings.locale, value: 'lv-LV' }),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSettingsConfiguratorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserSettingsConfiguratorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('settings', baseSettings);
    fixture.detectChanges();
  });

  it('renders timezone/locale card and patches initial values', () => {
    const title = fixture.debugElement.query(By.css('mat-card-title'))?.nativeElement as HTMLElement;
    const selects = fixture.debugElement.queryAll(By.css('mat-select'));

    expect(title.textContent?.trim()).toBe('User Preferences');
    expect(selects).toHaveLength(2);
    expect((component as any).userSettingsFormModel().timezone).toBe('Europe/Riga');
    expect((component as any).userSettingsFormModel().locale).toBe('lv-LV');
  });

  it('emits changed setting when timezone value changes', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');

    (component as any).onTimezoneChange('UTC');

    (component as any).onSaveFormData();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const emitted = emitSpy.mock.calls[0][0] as SettingsSaveEvent;
    expect(emitted.successMessage).toBe('Successfully saved user preferences!');
    expect(emitted.changedSettings).toHaveLength(1);
    expect(emitted.changedSettings[0].name).toBe(JiraUserSettings.userTimeZone);
    expect(emitted.changedSettings[0].value).toBe('UTC');
  });

  it('resets form values on cancel', () => {
    (component as any).onTimezoneChange('UTC');
    (component as any).onLocaleChange('en-US');
    (component as any).onCancel();

    expect((component as any).userSettingsFormModel().timezone).toBe('Europe/Riga');
    expect((component as any).userSettingsFormModel().locale).toBe('lv-LV');
  });

  it('emits changed locale setting when locale value changes', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');

    (component as any).onLocaleChange('en-US');

    (component as any).onSaveFormData();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const emitted = emitSpy.mock.calls[0][0] as SettingsSaveEvent;
    expect(emitted.successMessage).toBe('Successfully saved user preferences!');
    expect(emitted.changedSettings).toHaveLength(1);
    expect(emitted.changedSettings[0].name).toBe(JiraUserSettings.locale);
    expect(emitted.changedSettings[0].value).toBe('en-US');
  });

  it('does not emit when values are unchanged and prevents native submit', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const preventDefault = vi.fn();

    (component as any).onSaveFormData({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('handles disabled controls', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect((fixture.debugElement.query(By.css('button[aria-label="Save"]')).nativeElement as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps an unknown configured timezone in the option list', () => {
    fixture.componentRef.setInput('settings', [
      new Setting({ id: '4', name: JiraUserSettings.userTimeZone, value: 'Mars/Olympus' }),
      new Setting({ id: '5', name: JiraUserSettings.locale, value: 'lv-LV' }),
    ]);
    fixture.detectChanges();

    expect((component as any).timezones[0]).toBe('Mars/Olympus');
  });

  it('uses timezone fallback when Intl timezone enumeration is unavailable or throws', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'supportedValuesOf');
    try {
      Object.defineProperty(Intl, 'supportedValuesOf', { configurable: true, value: undefined });
      expect((component as any).getSupportedTimezones()).toContain('UTC');
      Object.defineProperty(Intl, 'supportedValuesOf', { configurable: true, value: vi.fn(() => { throw new Error('unsupported'); }) });
      expect((component as any).getSupportedTimezones()).toContain('Europe/Riga');
    } finally {
      if (descriptor) {
        Object.defineProperty(Intl, 'supportedValuesOf', descriptor);
      }
    }
  });

  it('wires select, submit, and cancel template events', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const timezoneSpy = vi.spyOn(component as any, 'onTimezoneChange');
    const localeSpy = vi.spyOn(component as any, 'onLocaleChange');
    const cancelSpy = vi.spyOn(component as any, 'onCancel');
    const selects = fixture.debugElement.queryAll(By.css('mat-select'));

    selects[0].triggerEventHandler('valueChange', 'UTC');
    selects[1].triggerEventHandler('valueChange', 'en-US');
    fixture.debugElement.query(By.css('form')).nativeElement.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    fixture.debugElement.query(By.css('button[aria-label="Cancel"]')).nativeElement.click();

    expect(timezoneSpy).toHaveBeenCalledWith('UTC');
    expect(localeSpy).toHaveBeenCalledWith('en-US');
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});
