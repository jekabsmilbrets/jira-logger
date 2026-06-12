import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DateAdapter } from '@angular/material/core';

import { environment } from '@environments/environment';

import { LocaleService } from './locale.service';
import { MaterialLocaleBridgeService } from './material-locale-bridge.service';

describe('MaterialLocaleBridgeService', () => {
  it('sets the initial adapter locale from the environment', () => {
    const localeState = signal<string>(environment['appLocale'] as string);
    const setLocale = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        MaterialLocaleBridgeService,
        {
          provide: DateAdapter,
          useValue: {
            setLocale,
          },
        },
        {
          provide: LocaleService,
          useValue: {
            localeSignal: localeState.asReadonly(),
          },
        },
      ],
    });

    TestBed.inject(MaterialLocaleBridgeService);

    expect(setLocale).toHaveBeenCalledTimes(1);
    expect(setLocale).toHaveBeenCalledWith(environment['appLocale']);
  });

  it('updates the adapter locale when LocaleService changes', () => {
    const localeState = signal<string>(environment['appLocale'] as string);
    const setLocale = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        MaterialLocaleBridgeService,
        {
          provide: DateAdapter,
          useValue: {
            setLocale,
          },
        },
        {
          provide: LocaleService,
          useValue: {
            localeSignal: localeState.asReadonly(),
          },
        },
      ],
    });

    TestBed.inject(MaterialLocaleBridgeService);
    localeState.set('en-US');
    TestBed.flushEffects();

    expect(setLocale).toHaveBeenCalledTimes(2);
    expect(setLocale).toHaveBeenNthCalledWith(2, 'en-US');
  });

  it('does not update the adapter when the locale remains unchanged', () => {
    const localeState = signal<string>(environment['appLocale'] as string);
    const setLocale = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        MaterialLocaleBridgeService,
        {
          provide: DateAdapter,
          useValue: {
            setLocale,
          },
        },
        {
          provide: LocaleService,
          useValue: {
            localeSignal: localeState.asReadonly(),
          },
        },
      ],
    });

    TestBed.inject(MaterialLocaleBridgeService);
    localeState.set(environment['appLocale'] as string);
    TestBed.flushEffects();

    expect(setLocale).toHaveBeenCalledTimes(1);
  });
});
