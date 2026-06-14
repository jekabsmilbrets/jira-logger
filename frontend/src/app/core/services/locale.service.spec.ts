import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Setting } from '@core/models/setting.model';
import { SettingsService } from '@core/services/settings.service';

import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';

import { LocaleService } from './locale.service';

describe('Core Services locale.service', () => {
  it('uses locale from settings when supported', async () => {
    const settings = signal<Setting[]>([
      new Setting({ id: '1', name: JiraUserSettings.locale, value: 'en-US' }),
    ]);

    TestBed.configureTestingModule({
      providers: [
        LocaleService,
        {
          provide: SettingsService,
          useValue: { settings: settings.asReadonly() },
        },
      ],
    });

    const service = TestBed.inject(LocaleService);
    await Promise.resolve();

    expect(service.locale).toBe('en-US');
  });

  it('falls back to default locale when setting is invalid', async () => {
    const settings = signal<Setting[]>([
      new Setting({ id: '1', name: JiraUserSettings.locale, value: 'invalid-locale' }),
    ]);

    TestBed.configureTestingModule({
      providers: [
        LocaleService,
        {
          provide: SettingsService,
          useValue: { settings: settings.asReadonly() },
        },
      ],
    });

    const service = TestBed.inject(LocaleService);
    await Promise.resolve();

    expect(service.locale).toBe('lv-LV');
  });
});
