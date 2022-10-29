import { Component, OnDestroy, OnInit }                  from '@angular/core';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';

import { interval, switchMap, catchError, retry, throwError, take, Subscription, tap, startWith } from 'rxjs';

import { MonitorService } from '@core/services/monitor.service';


@Component(
  {
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
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
    this.window?.navigator?.storage?.persist()
        .then(
          (persistent: boolean) => console.log('IndexedDB will be persistent ' + persistent),
        );
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
                                  count: 1,
                                  delay: this.monitorInterval * 2,
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
