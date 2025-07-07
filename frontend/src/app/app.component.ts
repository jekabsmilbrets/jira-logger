import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';

import { MonitorService } from '@core/services/monitor.service';

import { catchError, interval, retry, startWith, Subscription, switchMap, take, tap, throwError, timer } from 'rxjs';

@Component(
  {
    selector: 'app-root',
    templateUrl: './app.component.html',
    standalone: false,
  },
)
export class AppComponent implements OnDestroy, OnInit {
  title = 'jira-logger';

  private snackBarRef!: MatSnackBarRef<TextOnlySnackBar> | undefined;

  private monitorInterval = 60000;

  private houseCallSubscription!: Subscription;

  constructor(
    private window: Window,
    private monitorService: MonitorService,
    private snackBar: MatSnackBar,
  ) {
    this.window?.navigator?.storage?.persist();
  }

  public ngOnInit(): void {
    this.houseCallSubscription = interval(this.monitorInterval)
      .pipe(
        startWith(null),
        switchMap(() => this.monitorService.callMonitor()
          .pipe(
            catchError((error) => {
              if (!this.snackBarRef) {
                this.snackBarRef = this.snackBar.open(
                  'Failed to call JiraLogger service, will retry!',
                  'Dismiss',
                  {
                    politeness: 'assertive',
                    duration: this.monitorInterval,
                  },
                );

                this.snackBarRef.afterDismissed()
                  .pipe(take(1))
                  .subscribe(() => this.snackBarRef = undefined);
              }
              return throwError(() => error);
            }),
            retry(
              {
                count: 10,
                delay: (_: any, retryCount: number) => timer(Math.pow(2, retryCount) * 250),
              },
            ),
            tap(() => this.snackBarRef ? this.snackBarRef.dismiss() : undefined),
          )),
      )
      .subscribe();
  }

  public ngOnDestroy(): void {
    if (this.houseCallSubscription) {
      this.houseCallSubscription.unsubscribe();
    }
  }
}
