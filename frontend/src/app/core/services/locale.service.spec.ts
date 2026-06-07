import { TestBed } from '@angular/core/testing';

import { Setting } from '@core/models/setting.model';
import { SettingsService } from '@core/services/settings.service';
import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';

import { BehaviorSubject } from 'rxjs';

import { LocaleService } from './locale.service';

describe('Core Services locale.service', () => {
  it('uses locale from settings when supported', () => {
    const settings$ = new BehaviorSubject<Setting[]>([
      new Setting({ id: '1', name: JiraUserSettings.locale, value: 'en-US' }),
    ]);

    TestBed.configureTestingModule({
      providers: [
        LocaleService,
        {
          provide: SettingsService,
          useValue: { settings$ },
        },
      ],
    });

    const service = TestBed.inject(LocaleService);

    expect(service.locale).toBe('en-US');
  });

  it('falls back to default locale when setting is invalid', () => {
    const settings$ = new BehaviorSubject<Setting[]>([
      new Setting({ id: '1', name: JiraUserSettings.locale, value: 'invalid-locale' }),
    ]);

    TestBed.configureTestingModule({
      providers: [
        LocaleService,
        {
          provide: SettingsService,
          useValue: { settings$ },
        },
      ],
    });

    const service = TestBed.inject(LocaleService);

    expect(service.locale).toBe('lv-LV');
  });
});
