import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from 'environments/environment';

import { BehaviorSubject, catchError, map, Observable, switchMap, tap, throwError } from 'rxjs';

import { adaptMonitor }       from '@core/adapters/monitor.adapter';
import { ApiMonitor }         from '@core/interfaces/api/monitor.interface';
import { JsonApi }            from '@core/interfaces/json-api.interface';
import { Monitor }            from '@core/models/monitor.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { waitForTurn }        from '@core/utils/wait-for.utility';

import { LoadableService } from '@shared/interfaces/loadable-service.interface';


@Injectable(
  {
    providedIn: 'root',
  },
)
export class MonitorService implements LoadableService {
  public isLoading$: Observable<boolean>;
  public monitor$: Observable<Monitor | undefined>;
  public hasIssues$: Observable<boolean>;

  private monitorSubject: BehaviorSubject<Monitor | undefined> = new BehaviorSubject<Monitor | undefined>(undefined);
  private hasIssuesSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  private basePath = 'monitor';

  constructor(
    public readonly loaderStateService: LoaderStateService,
    private http: HttpClient,
  ) {
    this.isLoading$ = this.isLoadingSubject.asObservable();
    this.monitor$ = this.monitorSubject.asObservable();
    this.hasIssues$ = this.hasIssuesSubject.asObservable();
  }

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading$, this.constructor.name);
  }

  public callMonitor(): Observable<Monitor> {
    const url = `${environment.apiHost}${environment.apiBase}/${this.basePath}`;

    this.hasIssuesSubject.next(false);

    return waitForTurn(this.isLoading$, this.isLoadingSubject)
      .pipe(
        switchMap(() => this.http.get<JsonApi<ApiMonitor>>(url)),
        catchError((error) => {
          console.error(error);
          this.hasIssuesSubject.next(true);
          return throwError(() => new Error('Monitor unavailable'));
        }),
        tap(() => this.isLoadingSubject.next(false)),
        map((response: JsonApi<ApiMonitor>) => (response.data && adaptMonitor(response.data)) as Monitor),
        tap((monitor: Monitor) => this.monitorSubject.next(monitor)),
      );
  }
}
