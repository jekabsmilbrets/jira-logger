import { APP_BASE_HREF } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, isDevMode, LOCALE_ID, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { environment } from '@environments/environment';

import { runtimeConfigInitializer } from '@core/config/runtime-config.initializer';
import { MaterialLocaleBridgeService } from '@core/services/material-locale-bridge.service';
import { MonitorService } from '@core/services/monitor.service';
import { SettingsService } from '@core/services/settings.service';
import { StorageService } from '@core/services/storage.service';

import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';
import type { LoadableInitializer } from '@shared/interfaces/loadable-initializer.interface';

import { TaskBackupService } from '@tasks/services/task-backup.service';

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
      const services: LoadableInitializer[] = [
        inject(TasksService),
        inject(TimeLogsService),
        inject(MonitorService),
        inject(StorageService),
        inject(TaskBackupService),
        inject(SettingsService),
        inject(TagsService),
      ];

      services.forEach((service: LoadableInitializer) => {
        service.init();
      });
    }),
    provideAppInitializer(() => {
      inject(MaterialLocaleBridgeService);
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
