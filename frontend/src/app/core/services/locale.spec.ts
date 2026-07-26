import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { environment } from '@environments/environment';

import { Setting } from '@core/models/setting.model';
import { Settings } from '@core/services/settings';

import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';

import { Locale } from './locale';

describe('Core Services locale', () => {
  it('uses locale from settings when supported', async () => {
    const settings = signal<Setting[]>([
      new Setting({ id: '1', name: JiraUserSettings.locale, value: 'en-US' }),
    ]);

    TestBed.configureTestingModule({
      providers: [
        Locale,
        {
          provide: Settings,
          useValue: { settings: settings.asReadonly() },
        },
      ],
    });

    const service = TestBed.inject(Locale);
    await Promise.resolve();

    expect(service.locale).toBe('en-US');
  });

  it('falls back to default locale when setting is invalid', async () => {
    const settings = signal<Setting[]>([
      new Setting({ id: '1', name: JiraUserSettings.locale, value: 'invalid-locale' }),
    ]);

    TestBed.configureTestingModule({
      providers: [
        Locale,
        {
          provide: Settings,
          useValue: { settings: settings.asReadonly() },
        },
      ],
    });

    const service = TestBed.inject(Locale);
    await Promise.resolve();

    expect(service.locale).toBe(environment['appLocale'] as string);
  });

  it('reacts to settings changes while preserving the public locale getter and localeSignal', async () => {
    const settings = signal<Setting[]>([]);

    TestBed.configureTestingModule({
      providers: [
        Locale,
        {
          provide: Settings,
          useValue: { settings: settings.asReadonly() },
        },
      ],
    });

    const service = TestBed.inject(Locale);
    await Promise.resolve();

    expect(service.locale).toBe(environment['appLocale'] as string);
    expect(service.localeSignal()).toBe(environment['appLocale'] as string);

    settings.set([
      new Setting({ id: '1', name: JiraUserSettings.locale, value: 'de-DE' }),
    ]);

    await Promise.resolve();

    expect(service.locale).toBe('de-DE');
    expect(service.localeSignal()).toBe('de-DE');
  });

  it('loads supported locale data once, shares in-flight loads, and ignores unknown locales', async () => {
    TestBed.configureTestingModule({ providers: [Locale] });
    const service = TestBed.inject(Locale) as any;
    const ensure = service.ensureLocaleDataLoaded.bind(service);

    await Promise.all([ensure('es-ES'), ensure('es-ES')]);
    await ensure('lv-LV');
    await ensure('de-DE');
    await ensure('fr-FR');
    await ensure('not-supported');

    expect(service.loadedLocales.has('es-ES')).toBe(true);
    expect(service.loadedLocales.has('lv-LV')).toBe(true);
    expect(service.loadedLocales.has('de-DE')).toBe(true);
    expect(service.loadedLocales.has('fr-FR')).toBe(true);
    expect(service.loadingLocales.size).toBe(0);
  });
});
