import { HttpClient } from '@angular/common/http';
import { inject, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, finalize, map, type Observable, switchMap, tap, throwError } from 'rxjs';

import { environment } from '@environments/environment';

import { adaptMonitor } from '@core/adapters/monitor.adapter';
import type { ApiMonitor } from '@core/interfaces/api/monitor.interface';
import type { JsonApi } from '@core/interfaces/json-api.interface';
import { Monitor } from '@core/models/monitor.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { RequestGate } from '@core/utilities/request-gate.utility';
import { waitForTurn } from '@core/utilities/wait-for.utility';

import type { LoadableService } from '@shared/interfaces/loadable-service.interface';

@Service()
export class MonitorService implements LoadableService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly httpClient: HttpClient = inject(HttpClient);

  private readonly monitorSignal: WritableSignal<Monitor | undefined> = signal<Monitor | undefined>(undefined);
  private readonly hasIssuesSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly isLoadingSignal: WritableSignal<boolean> = signal<boolean>(false);

  public readonly monitor: Signal<Monitor | undefined> = this.monitorSignal.asReadonly();
  public readonly hasIssues: Signal<boolean> = this.hasIssuesSignal.asReadonly();
  public readonly isLoading: Signal<boolean> = this.isLoadingSignal.asReadonly();

  private readonly requestGate: RequestGate = new RequestGate();

  private basePath: string = 'monitor';

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
