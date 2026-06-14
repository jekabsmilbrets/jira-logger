import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Injector, Signal, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

import { catchError, filter, map, Observable, of, switchMap, take, tap, throwError } from 'rxjs';

import { environment } from '@environments/environment';

import { adaptMonitor } from '@core/adapters/monitor.adapter';
import { ApiMonitor } from '@core/interfaces/api/monitor.interface';
import { JsonApi } from '@core/interfaces/json-api.interface';
import { Monitor } from '@core/models/monitor.model';
import { LoaderStateService } from '@core/services/loader-state.service';

import { LoadableService } from '@shared/interfaces/loadable-service.interface';

@Injectable({
  providedIn: 'root',
})
export class MonitorService implements LoadableService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  public readonly isLoading$: Observable<boolean>;
  public readonly monitor$: Observable<Monitor | undefined>;
  public readonly hasIssues$: Observable<boolean>;

  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly injector: Injector = inject(Injector);

  private readonly monitorSignal = signal<Monitor | undefined>(undefined);
  private readonly hasIssuesSignal = signal<boolean>(false);
  private readonly isLoadingSignal = signal<boolean>(false);

  private basePath: string = 'monitor';

  public get monitor(): Signal<Monitor | undefined> {
    return this.monitorSignal.asReadonly();
  }

  public get hasIssues(): Signal<boolean> {
    return this.hasIssuesSignal.asReadonly();
  }

  public get isLoading(): Signal<boolean> {
    return this.isLoadingSignal.asReadonly();
  }

  constructor() {
    this.isLoading$ = toObservable(this.isLoading, { injector: this.injector });
    this.monitor$ = toObservable(this.monitor, { injector: this.injector });
    this.hasIssues$ = toObservable(this.hasIssues, { injector: this.injector });
  }

  public init(): void {
    this.loaderStateService.addLoader(
      this.isLoading$,
      this.constructor.name,
    );
  }

  public callMonitor(): Observable<Monitor> {
    const url: string = `${ environment['apiHost'] }${ environment['apiBase'] }/${ this.basePath }`;

    this.hasIssuesSignal.set(false);

    return this.waitForTurn()
      .pipe(
        switchMap(() => this.httpClient.get<JsonApi<ApiMonitor>>(url)),
        catchError(() => {
          this.hasIssuesSignal.set(true);
          this.isLoadingSignal.set(false);

          return throwError(() => new Error('Monitor unavailable'));
        }),
        tap(() => this.isLoadingSignal.set(false)),
        map((response: JsonApi<ApiMonitor>) => (response.data && adaptMonitor(response.data)) as Monitor),
        tap((monitor: Monitor) => this.monitorSignal.set(monitor)),
      );
  }

  private waitForTurn(): Observable<boolean> {
    if (!this.isLoadingSignal()) {
      this.isLoadingSignal.set(true);
      return of(true);
    }

    return this.isLoading$
      .pipe(
        filter((isLoading: boolean) => !isLoading),
        take(1),
        tap(() => this.isLoadingSignal.set(true)),
      );
  }
}
