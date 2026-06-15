import { HttpClient } from '@angular/common/http';
import { inject, Service, Signal, signal } from '@angular/core';

import { catchError, finalize, map, Observable, switchMap, tap, throwError } from 'rxjs';

import { environment } from '@environments/environment';

import { adaptMonitor } from '@core/adapters/monitor.adapter';
import { ApiMonitor } from '@core/interfaces/api/monitor.interface';
import { JsonApi } from '@core/interfaces/json-api.interface';
import { Monitor } from '@core/models/monitor.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { RequestGate } from '@core/utils/request-gate.utility';
import { waitForTurn } from '@core/utils/wait-for.utility';

import { LoadableService } from '@shared/interfaces/loadable-service.interface';

@Service()
export class MonitorService implements LoadableService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly httpClient: HttpClient = inject(HttpClient);

  private readonly monitorSignal = signal<Monitor | undefined>(undefined);
  private readonly hasIssuesSignal = signal<boolean>(false);
  private readonly isLoadingSignal = signal<boolean>(false);
  private readonly requestGate = new RequestGate();

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

  public init(): void {
    this.loaderStateService.addLoader(
      this.isLoading,
      this.constructor.name,
    );
  }

  public callMonitor(): Observable<Monitor> {
    const url: string = `${ environment['apiHost'] }${ environment['apiBase'] }/${ this.basePath }`;

    this.hasIssuesSignal.set(false);

    return waitForTurn(this.requestGate, this.isLoadingSignal)
      .pipe(
        switchMap((release: VoidFunction) => this.httpClient.get<JsonApi<ApiMonitor>>(url)
          .pipe(
            catchError(() => {
              this.hasIssuesSignal.set(true);
              release();

              return throwError(() => new Error('Monitor unavailable'));
            }),
            map((response: JsonApi<ApiMonitor>) => (response.data && adaptMonitor(response.data)) as Monitor),
            tap((monitor: Monitor) => this.monitorSignal.set(monitor)),
            finalize(release),
          )),
      );
  }
}
