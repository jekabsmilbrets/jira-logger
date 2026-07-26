import { APP_BASE_HREF } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, isDevMode, LOCALE_ID, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { environment } from '@environments/environment';

import { runtimeConfigInitializer } from '@core/config/runtime-config.initializer';
import { MaterialLocaleBridge } from '@core/services/material-locale-bridge';
import { Monitor } from '@core/services/monitor';
import { Settings } from '@core/services/settings';
import { Storage } from '@core/services/storage';

import { Tags } from '@shared/services/tags';
import { Tasks } from '@shared/services/tasks';
import { TimeLogs } from '@shared/services/time-logs';

import { TaskBackup } from '@tasks/services/task-backup/task-backup';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideHttpClient(
      withInterceptors([]),
    ),
    provideAppInitializer(() => runtimeConfigInitializer()),
    provideAppInitializer(() => {
      [
        inject(Tasks),
        inject(TimeLogs),
        inject(Monitor),
        inject(Storage),
        inject(TaskBackup),
        inject(Settings),
        inject(Tags),
      ].forEach((service) => service.init());
    }),
    provideAppInitializer(() => {
      inject(MaterialLocaleBridge);
    }),
    {
      provide: LOCALE_ID,
      useValue: environment['appLocale'],
    },
    {
      provide: APP_BASE_HREF,
      useValue: '/',
    },
    {
      provide: Window,
      useValue: window,
    },
    provideNativeDateAdapter(),
  ],
};
