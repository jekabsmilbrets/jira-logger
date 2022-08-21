import { APP_BASE_HREF, registerLocaleData }    from '@angular/common';
import lv                                       from '@angular/common/locales/lv';
import { LOCALE_ID, NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule }                        from '@angular/platform-browser';
import { BrowserAnimationsModule }              from '@angular/platform-browser/animations';
import { ServiceWorkerModule }                  from '@angular/service-worker';

import { environment } from 'environments/environment';

import { CoreModule } from '@core/core.module';

import { tagsProviderFactory } from '@shared/factories/tags-provider-factory';
import { TagsService }         from '@shared/services/tags.service';

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
      TagsService,
      {
        provide: APP_INITIALIZER,
        useFactory: tagsProviderFactory,
        deps: [TagsService],
        multi: true,
      },
    ],
    bootstrap: [AppComponent],
  },
)
export class AppModule {
}
