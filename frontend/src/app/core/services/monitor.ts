import { inject, OnDestroy, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, interval, map, type Observable, Subscription, switchMap, tap, throwError } from 'rxjs';

import { adaptMonitor } from '@core/adapters/monitor.adapter';
import type { ApiMonitor } from '@core/interfaces/api/monitor.interface';
import type { JsonApi } from '@core/interfaces/json-api.interface';
import { Monitor as MonitorModel } from '@core/models/monitor.model';
import { LoaderState } from '@core/services/loader-state';

import type { ResourceRequestHandle } from '@shared/interfaces/resource-request-handle.interface';
import { ApiRequest } from '@shared/services/api-request';

@Service()
export class Monitor implements OnDestroy {
  public readonly loaderStateService: LoaderState = inject(LoaderState);

  private readonly apiRequestService: ApiRequest = inject(ApiRequest);
  private readonly monitorResource: ResourceRequestHandle = this.apiRequestService.resource('monitor');

  private readonly monitorSignal: WritableSignal<MonitorModel | undefined> = signal<MonitorModel | undefined>(undefined);
  private readonly hasIssuesSignal: WritableSignal<boolean> = signal<boolean>(false);

  public readonly monitor: Signal<MonitorModel | undefined> = this.monitorSignal.asReadonly();
  public readonly hasIssues: Signal<boolean> = this.hasIssuesSignal.asReadonly();
  public readonly isLoading: Signal<boolean> = this.monitorResource.isLoading;

  private readonly subscription: Subscription = new Subscription();

  private readonly monitorRefreshInterval: number = 30000;

  public ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  public init(): void {
    this.loaderStateService.addLoader(
      this.isLoading,
      'Monitor',
    );

    this.subscription.add(
      interval(this.monitorRefreshInterval)
        .pipe(
          switchMap(() => this.callMonitor()),
        )
        .subscribe(),
    );
  }

  public callMonitor(): Observable<MonitorModel> {
    this.hasIssuesSignal.set(false);

    return this.monitorResource.request<JsonApi<ApiMonitor>>('')
      .pipe(
        catchError(() => {
          this.hasIssuesSignal.set(true);

          return throwError(() => new Error('Monitor unavailable'));
        }),
        map((response: JsonApi<ApiMonitor>) => (response.data && adaptMonitor(response.data)) as MonitorModel),
        tap((monitor: MonitorModel) => this.monitorSignal.set(monitor)),
      );
  }
}
