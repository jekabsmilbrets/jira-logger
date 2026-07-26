import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DateAdapter } from '@angular/material/core';

import { environment } from '@environments/environment';

import { Locale } from './locale';
import { MaterialLocaleBridge } from './material-locale-bridge';

describe('Core Services MaterialLocaleBridge', () => {
  it('sets the initial adapter locale from the environment', () => {
    const localeState = signal<string>(environment['appLocale'] as string);
    const setLocale = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        MaterialLocaleBridge,
        {
          provide: DateAdapter,
          useValue: {
            setLocale,
          },
        },
        {
          provide: Locale,
          useValue: {
            localeSignal: localeState.asReadonly(),
          },
        },
      ],
    });

    TestBed.inject(MaterialLocaleBridge);

    expect(setLocale).toHaveBeenCalledTimes(1);
    expect(setLocale).toHaveBeenCalledWith(environment['appLocale']);
  });

  it('updates the adapter locale when Locale changes', () => {
    const localeState = signal<string>(environment['appLocale'] as string);
    const setLocale = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        MaterialLocaleBridge,
        {
          provide: DateAdapter,
          useValue: {
            setLocale,
          },
        },
        {
          provide: Locale,
          useValue: {
            localeSignal: localeState.asReadonly(),
          },
        },
      ],
    });

    TestBed.inject(MaterialLocaleBridge);
    localeState.set('en-US');
    TestBed.tick();

    expect(setLocale).toHaveBeenCalledTimes(2);
    expect(setLocale).toHaveBeenNthCalledWith(2, 'en-US');
  });

  it('does not update the adapter when the locale remains unchanged', () => {
    const localeState = signal<string>(environment['appLocale'] as string);
    const setLocale = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        MaterialLocaleBridge,
        {
          provide: DateAdapter,
          useValue: {
            setLocale,
          },
        },
        {
          provide: Locale,
          useValue: {
            localeSignal: localeState.asReadonly(),
          },
        },
      ],
    });

    TestBed.inject(MaterialLocaleBridge);
    localeState.set(environment['appLocale'] as string);
    TestBed.tick();

    expect(setLocale).toHaveBeenCalledTimes(1);
  });
});
