import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { StorageService } from 'src/app/services/storage.service';
import { TasksService } from 'src/app/services/tasks.service';

import { environment } from '../environments/environment';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TaskListComponent } from './components/task-list/task-list.component';
import { TaskComponent } from './components/task/task.component';
import { ReportComponent } from './views/report/report.component';
import { TasksComponent } from './views/tasks/tasks.component';
import { TimerComponent } from './views/timer/timer.component';

@NgModule({
  declarations: [
    AppComponent,
    TasksComponent,
    TimerComponent,
    ReportComponent,
    TaskComponent,
    TaskListComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the app is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000',
    }),
    BrowserAnimationsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ],
  providers: [
    StorageService,
    TasksService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
}
