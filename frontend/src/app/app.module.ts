import { APP_BASE_HREF, registerLocaleData }    from '@angular/common';
import lv                                       from '@angular/common/locales/lv';
import { APP_INITIALIZER, LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule }                        from '@angular/platform-browser';
import { BrowserAnimationsModule }              from '@angular/platform-browser/animations';
import { ServiceWorkerModule }                  from '@angular/service-worker';

import { environment } from 'environments/environment';

import { CoreModule }      from '@core/core.module';
import { MonitorService }  from '@core/services/monitor.service';
import { SettingsService } from '@core/services/settings.service';
import { StorageService }  from '@core/services/storage.service';

import { loadableServicesInitializerFactory } from '@shared/factories/loadable-services-initializer.factory';
import { tagsPreloaderFactory }               from '@shared/factories/tags-preloader.factory';
import { TagsService }                        from '@shared/services/tags.service';
import { TasksService }                       from '@shared/services/tasks.service';
import { TimeLogsService }                    from '@shared/services/time-logs.service';

import { TaskImportService } from '@task/services/task-import.service';

import { LayoutModule } from '@layout/layout.module';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent }     from './app.component';


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
      {
        provide: APP_INITIALIZER,
        useFactory: loadableServicesInitializerFactory,
        deps: [
          TagsService,
          TasksService,
          TimeLogsService,
          MonitorService,
          StorageService,
          TaskImportService,
          SettingsService,
        ],
        multi: true,
      },
      {
        provide: APP_INITIALIZER,
        useFactory: tagsPreloaderFactory,
        deps: [TagsService],
        multi: true,
      },
    ],
    bootstrap: [AppComponent],
  },
)
export class AppModule {
}
