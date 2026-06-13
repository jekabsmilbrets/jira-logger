import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { vi } from 'vitest';

import { Setting } from '@core/models/setting.model';

import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';

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

    expect(title.textContent?.trim()).toBe('User Time Zone');
    expect(selects).toHaveLength(2);
    expect((component as any).userSettingsFormModel().timezone).toBe('Europe/Riga');
    expect((component as any).userSettingsFormModel().locale).toBe('lv-LV');
  });

  it('emits changed setting when timezone value changes', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');

    (component as any).onTimezoneChange('UTC');

    (component as any).onSaveFormData();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const emitted = emitSpy.mock.calls[0][0] as Setting[];
    expect(emitted).toHaveLength(1);
    expect(emitted[0].name).toBe(JiraUserSettings.userTimeZone);
    expect(emitted[0].value).toBe('UTC');
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
    const emitted = emitSpy.mock.calls[0][0] as Setting[];
    expect(emitted).toHaveLength(1);
    expect(emitted[0].name).toBe(JiraUserSettings.locale);
    expect(emitted[0].value).toBe('en-US');
  });
});
