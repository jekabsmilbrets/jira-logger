import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { vi } from 'vitest';

import { Setting } from '@core/models/setting.model';

import { JiraUserSettings, JiraUserSettingSlugs } from '@settings/enums/jira-user-settings.enum';

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
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(UserSettingsConfiguratorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('settings', baseSettings);
    fixture.detectChanges();
  });

  it('renders timezone/locale card and patches initial values', () => {
    const title = fixture.debugElement.query(By.css('mat-card-title'))?.nativeElement as HTMLElement;
    const timezoneSelect = fixture.debugElement.query(By.css('mat-select[formControlName="jira-user-time-zone"]'));
    const localeSelect = fixture.debugElement.query(By.css('mat-select[formControlName="jira-locale"]'));
    const formGroup = (component as any).formGroup;

    expect(title.textContent?.trim()).toBe('User Time Zone');
    expect(timezoneSelect).toBeTruthy();
    expect(localeSelect).toBeTruthy();
    expect(formGroup.controls[JiraUserSettingSlugs.userTimeZone].value).toBe('Europe/Riga');
    expect(formGroup.controls[JiraUserSettingSlugs.locale].value).toBe('lv-LV');
  });

  it('emits changed setting when timezone value changes', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const formGroup = (component as any).formGroup;

    formGroup.controls[JiraUserSettingSlugs.userTimeZone].setValue('UTC');

    (component as any).onSaveFormData();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const emitted = emitSpy.mock.calls[0][0] as Setting[];
    expect(emitted).toHaveLength(1);
    expect(emitted[0].name).toBe(JiraUserSettings.userTimeZone);
    expect(emitted[0].value).toBe('UTC');
  });

  it('resets form values on cancel', () => {
    const formGroup = (component as any).formGroup;

    formGroup.controls[JiraUserSettingSlugs.userTimeZone].setValue('UTC');
    formGroup.controls[JiraUserSettingSlugs.locale].setValue('en-US');
    (component as any).onCancel();

    expect(formGroup.controls[JiraUserSettingSlugs.userTimeZone].value).toBe('Europe/Riga');
    expect(formGroup.controls[JiraUserSettingSlugs.locale].value).toBe('lv-LV');
  });

  it('emits changed locale setting when locale value changes', () => {
    const emitSpy = vi.spyOn((component as any).settingsChange, 'emit');
    const formGroup = (component as any).formGroup;

    formGroup.controls[JiraUserSettingSlugs.locale].setValue('en-US');

    (component as any).onSaveFormData();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const emitted = emitSpy.mock.calls[0][0] as Setting[];
    expect(emitted).toHaveLength(1);
    expect(emitted[0].name).toBe(JiraUserSettings.locale);
    expect(emitted[0].value).toBe('en-US');
  });
});
