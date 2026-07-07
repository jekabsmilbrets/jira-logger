import { TestBed } from '@angular/core/testing';

import { Setting } from '@core/models/setting.model';

import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';

import { UserPreferencesAdapter } from './user-preferences.adapter';

describe('UserPreferencesAdapter', () => {
  let adapter: UserPreferencesAdapter;

  const settings: Setting[] = [
    new Setting({ id: '4', name: JiraUserSettings.userTimeZone, value: 'Europe/Riga' }),
    new Setting({ id: '5', name: JiraUserSettings.locale, value: 'lv-LV' }),
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserPreferencesAdapter],
    });

    adapter = TestBed.inject(UserPreferencesAdapter);
  });

  it('maps raw settings to form value with defaults', () => {
    expect(adapter.toFormValue(settings)).toEqual({
      timezone: 'Europe/Riga',
      locale: 'lv-LV',
    });
    expect(adapter.toFormValue([])).toEqual({
      timezone: '',
      locale: 'lv-LV',
    });
  });

  it('builds changed settings', () => {
    expect(adapter.changedSettings(settings, {
      timezone: 'UTC',
      locale: 'en-US',
    })).toEqual([
      expect.objectContaining({ id: '4', name: JiraUserSettings.userTimeZone, value: 'UTC' }),
      expect.objectContaining({ id: '5', name: JiraUserSettings.locale, value: 'en-US' }),
    ]);
  });
});
