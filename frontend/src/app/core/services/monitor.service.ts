import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { adaptMonitor } from '@core/adapters/monitor.adapter';
import { ApiMonitor } from '@core/interfaces/api/monitor.interface';
import { JsonApi } from '@core/interfaces/json-api.interface';
import { Monitor } from '@core/models/monitor.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { waitForTurn } from '@core/utils/wait-for.utility';

import { LoadableService } from '@shared/interfaces/loadable-service.interface';

import { environment } from 'environments/environment';

import { BehaviorSubject, catchError, map, Observable, switchMap, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MonitorService implements LoadableService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  public isLoading$: Observable<boolean>;
  public monitor$: Observable<Monitor | undefined>;
  public hasIssues$: Observable<boolean>;

  private readonly httpClient: HttpClient = inject(HttpClient);

  private monitorSubject: BehaviorSubject<Monitor | undefined> = new BehaviorSubject<Monitor | undefined>(undefined);
  private hasIssuesSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  private basePath: string = 'monitor';

  constructor() {
    this.isLoading$ = this.isLoadingSubject.asObservable();
    this.monitor$ = this.monitorSubject.asObservable();
    this.hasIssues$ = this.hasIssuesSubject.asObservable();
  }

  public init(): void {
    this.loaderStateService.addLoader(
      this.isLoading$,
      this.constructor.name,
    );
  }

  public callMonitor(): Observable<Monitor> {
    const url: string = `${ environment['apiHost'] }${ environment['apiBase'] }/${ this.basePath }`;

    this.hasIssuesSubject.next(false);

    return waitForTurn(
      this.isLoading$,
      this.isLoadingSubject,
    )
      .pipe(
        switchMap(() => this.httpClient.get<JsonApi<ApiMonitor>>(url)),
        catchError(() => {
          this.hasIssuesSubject.next(true);
          this.isLoadingSubject.next(false);

          return throwError(() => new Error('Monitor unavailable'));
        }),
        tap(() => this.isLoadingSubject.next(false)),
        map((response: JsonApi<ApiMonitor>) => (response.data && adaptMonitor(response.data)) as Monitor),
        tap((monitor: Monitor) => this.monitorSubject.next(monitor)),
      );
  }
}
