import { APP_BASE_HREF, registerLocaleData } from '@angular/common';
import lv from '@angular/common/locales/lv';
import { inject, LOCALE_ID, NgModule, provideAppInitializer } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';

import { CoreModule } from '@core/core.module';
import { MonitorService } from '@core/services/monitor.service';
import { SettingsService } from '@core/services/settings.service';
import { StorageService } from '@core/services/storage.service';

import { LayoutModule } from '@layout/layout.module';

import { loadableServicesInitializerFactory } from '@shared/factories/loadable-services-initializer.factory';
import { tagsPreloaderFactory } from '@shared/factories/tags-preloader.factory';
import { TagsService } from '@shared/services/tags.service';
import { TaskManagerService } from '@shared/services/task-manager.service';
import { TasksService } from '@shared/services/tasks.service';
import { TimeLogsService } from '@shared/services/time-logs.service';
import { TaskCreateService } from '@tasks/services/task-create.service';

import { TaskImportService } from '@tasks/services/task-import.service';

import { environment } from 'environments/environment';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

registerLocaleData(lv);

@NgModule(
  {
    declarations: [
      AppComponent,
    ],
    imports: [
      BrowserModule,
      BrowserAnimationsModule,
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: environment.production,
        // Register the ServiceWorker as soon as the app is stable
        // or after 30 seconds (whichever comes first).
        registrationStrategy: 'registerWhenStable:30000',
      }),

      CoreModule,
      LayoutModule,

      AppRoutingModule,
    ],
    providers: [
      {
        provide: APP_BASE_HREF,
        useValue: '/',
      },
      {
        provide: LOCALE_ID,
        useValue: 'lv-LV',
      },
      {
        provide: Window,
        useValue: window,
      },
      provideAppInitializer(() => {
        const initializerFn = loadableServicesInitializerFactory(
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
        const initializerFn = tagsPreloaderFactory(
          inject(TagsService),
        );
        return initializerFn();
      }),
      TaskManagerService,
      TaskCreateService,
    ],
    bootstrap: [AppComponent],
  },
)
export class AppModule {
}
