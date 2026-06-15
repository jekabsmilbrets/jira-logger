import { APP_BASE_HREF } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
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

import { loadableServicesInitializerFactory } from '@shared/factories/loadable-services-initializer.factory';
import { tagsPreloaderFactory } from '@shared/factories/tags-preloader.factory';
import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';

import { TaskImportService } from '@tasks/services/task-import.service';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideHttpClient(withFetch()),
    provideAppInitializer(() => runtimeConfigInitializer()),
    provideAppInitializer(() => {
      const initializerFn: () => Promise<void> = loadableServicesInitializerFactory(
        inject(TagsService),
        inject(TasksService),
        inject(TimeLogsService),
        inject(MonitorService),
        inject(StorageService),
        inject(TaskImportService),
        inject(SettingsService),
      );

      return initializerFn();
    }),
    provideAppInitializer(() => {
      const initializerFn: () => Promise<Tag[]> = tagsPreloaderFactory(
        inject(TagsService),
      );

      return initializerFn();
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
