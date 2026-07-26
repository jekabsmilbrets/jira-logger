import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { environment } from '@environments/environment';

import { Setting } from '@core/models/setting.model';
import { Settings } from '@core/services/settings';

import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';

import { Timezone } from './timezone';

describe('Core Services timezone', () => {
  it('uses timezone from settings when it is valid', () => {
    const settingsState = signal<Setting[]>([
      new Setting({
        id: 'tz',
        name: JiraUserSettings.userTimeZone,
        value: 'Europe/Vienna',
      }),
    ]);

    TestBed.configureTestingModule({
      providers: [
        Timezone,
        { provide: Settings, useValue: { settings: settingsState.asReadonly() } },
      ],
    });

    const service = TestBed.inject(Timezone);

    expect(service.timezone).toBe('Europe/Vienna');
  });

  it('falls back to environment timezone when configured timezone is invalid', () => {
    const settingsState = signal<Setting[]>([
      new Setting({
        id: 'tz',
        name: JiraUserSettings.userTimeZone,
        value: ' Not/A-Real-Timezone ',
      }),
    ]);

    TestBed.configureTestingModule({
      providers: [
        Timezone,
        { provide: Settings, useValue: { settings: settingsState.asReadonly() } },
      ],
    });

    const service = TestBed.inject(Timezone);

    expect(service.timezone).toBe(environment['appTimeZone'] as string);
  });

  it('falls back to environment timezone when setting is missing', () => {
    const settingsState = signal<Setting[]>([]);

    TestBed.configureTestingModule({
      providers: [
        Timezone,
        { provide: Settings, useValue: { settings: settingsState.asReadonly() } },
      ],
    });

    const service = TestBed.inject(Timezone);

    expect(service.timezone).toBe(environment['appTimeZone'] as string);
  });

  it('reacts to settings changes without an effect-backed mirror', () => {
    const settingsState = signal<Setting[]>([]);

    TestBed.configureTestingModule({
      providers: [
        Timezone,
        { provide: Settings, useValue: { settings: settingsState.asReadonly() } },
      ],
    });

    const service = TestBed.inject(Timezone);

    expect(service.timezone).toBe(environment['appTimeZone'] as string);

    settingsState.set([
      new Setting({
        id: 'tz',
        name: JiraUserSettings.userTimeZone,
        value: 'Europe/Vienna',
      }),
    ]);

    expect(service.timezone).toBe('Europe/Vienna');
  });
});
