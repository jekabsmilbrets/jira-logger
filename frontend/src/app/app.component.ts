import { Component } from '@angular/core';

import { interval, switchMap } from 'rxjs';

import { MonitorService } from '@core/services/monitor.service';



@Component(
  {
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
  },
)
export class AppComponent {
  title = 'jira-logger';

  constructor(
    private window: Window,
    private monitorService: MonitorService,
  ) {
    this.window?.navigator?.storage?.persist()
        .then(
          (persistent: boolean) => console.log('IndexedDB will be persistent ' + persistent),
        );

    interval(10000)
      .pipe(
        switchMap(() => this.monitorService.callMonitor()),
      )
      .subscribe((response) => console.log(response));
  }
}
