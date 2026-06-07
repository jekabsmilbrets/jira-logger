import { LOCALE_ID, Provider } from '@angular/core';
import { environment } from 'environments/environment';

import { appConfig } from './app.config';

describe('appConfig', () => {
  it('provides LOCALE_ID through a static environment value', () => {
    const localeProvider: Provider | undefined = appConfig.providers.find(
      (provider: Provider | object) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === LOCALE_ID,
    ) as Provider | undefined;

    expect(localeProvider).toBeTruthy();
    expect(localeProvider).toMatchObject({
      provide: LOCALE_ID,
      useValue: environment['appLocale'],
    });
    expect('useValue' in (localeProvider as object)).toBe(true);
    expect('useFactory' in (localeProvider as object)).toBe(false);
  });
});
