import { TestBed } from '@angular/core/testing';

import { Setting } from '@core/models/setting.model';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';

import { JiraApiSettingsAdapter } from './jira-api-settings.adapter';

describe('Settings Adapter JiraApiSettingsAdapter', () => {
  let adapter: JiraApiSettingsAdapter;

  const settings: Setting[] = [
    new Setting({ id: '1', name: JiraApiSettings.enabled, value: 'true' }),
    new Setting({ id: '2', name: JiraApiSettings.host, value: 'https://jira.example' }),
    new Setting({ id: '3', name: JiraApiSettings.personalAccessToken, value: 'stored-token' }),
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [JiraApiSettingsAdapter],
    });

    adapter = TestBed.inject(JiraApiSettingsAdapter);
  });

  it('maps raw settings to form value and stored token state', () => {
    expect(adapter.toFormValue(settings)).toEqual({
      enabled: true,
      host: 'https://jira.example',
      personalAccessToken: '',
    });
    expect(adapter.hasStoredPersonalAccessToken(settings)).toBe(true);
  });

  it('falls back for missing settings and exposes enabled state', () => {
    expect(adapter.toFormValue([])).toEqual({
      enabled: false,
      host: '',
      personalAccessToken: '',
    });
    expect(adapter.isEnabled([])).toBe(false);
    expect(adapter.isEnabled([new Setting({ name: JiraApiSettings.enabled, value: 'FALSE' })])).toBe(false);
  });

  it('builds changed settings and omits blank token changes', () => {
    const changedSettings: Setting[] = adapter.changedSettings(settings, {
      enabled: false,
      host: 'https://jira.changed',
      personalAccessToken: '   ',
    });

    expect(changedSettings).toEqual([
      expect.objectContaining({ id: '1', name: JiraApiSettings.enabled, value: 'false' }),
      expect.objectContaining({ id: '2', name: JiraApiSettings.host, value: 'https://jira.changed' }),
    ]);
  });

  it('includes non-empty replacement tokens', () => {
    expect(adapter.changedSettings(settings, {
      enabled: true,
      host: 'https://jira.example',
      personalAccessToken: 'new-token',
    })).toEqual([
      expect.objectContaining({ id: '3', name: JiraApiSettings.personalAccessToken, value: 'new-token' }),
    ]);
  });
});
