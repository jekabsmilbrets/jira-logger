import { HttpClient, type HttpErrorResponse } from '@angular/common/http';
import { inject, injectAsync, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, finalize, map, type Observable, of, switchMap, take, tap } from 'rxjs';

import { environment } from '@environments/environment';

import { adaptSettings } from '@core/adapters/api-setting.adapter';
import type { ApiSetting } from '@core/interfaces/api/api-setting.interface';
import type { JsonApi } from '@core/interfaces/json-api.interface';
import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { RequestGate } from '@core/utilities/request-gate.utility';
import { waitForTurn } from '@core/utilities/wait-for.utility';

import type { LoadableService } from '@shared/interfaces/loadable-service.interface';
import type { ErrorDialogService } from '@shared/services/error-dialog.service';
import type { ApiRequestBody } from '@shared/types/api-request-body.type';
import type { AsyncLoader } from '@shared/types/async-loader.type';
import { openLoadErrorDialog } from '@shared/utilities/open-load-error-dialog.utility';

@Service()
export class SettingsService implements LoadableService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly loadErrorDialogService: AsyncLoader<ErrorDialogService> = injectAsync(
    () => import('@shared/services/error-dialog.service').then((m) => m.ErrorDialogService),
  );

  private readonly isLoadingSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly settingsSignal: WritableSignal<Setting[]> = signal<Setting[]>([]);

  public readonly isLoading: Signal<boolean> = this.isLoadingSignal.asReadonly();
  public readonly settings: Signal<Setting[]> = this.settingsSignal.asReadonly();

  private readonly requestGate: RequestGate = new RequestGate();

  private basePath: string = 'setting';

  public init(): void {
    this.loaderStateService.addLoader(
      this.isLoading,
      this.constructor.name,
    );
    this.list()
      .pipe(take(1))
      .subscribe();
  }

  public list(): Observable<Setting[]> {
    const url: string = `${ environment['apiHost'] }${ environment['apiBase'] }/${ this.basePath }`;

    return waitForTurn(this.requestGate, this.isLoadingSignal)
      .pipe(
        switchMap((release: VoidFunction) => this.httpClient.get<JsonApi<ApiSetting[]>>(url)
          .pipe(
            catchError((error: HttpErrorResponse) => {
              release();

              if (error.status === 404) {
                return of({ data: [] });
              }

              return this.processError(error);
            }),
            map(
              (response: JsonApi<ApiSetting[]>) => (response.data && adaptSettings(response.data)) as Setting[],
            ),
            finalize(release),
          )),
        tap((tasks: Setting[]) => this.settingsSignal.set(tasks)),
      );
  }

  public create(
    setting: Setting,
    skipReload: boolean = false,
  ): Observable<Setting> {
    const url: string = `${ environment['apiHost'] }${ environment['apiBase'] }/${ this.basePath }`;

    const body: ApiRequestBody = {
      name: setting.name,
      value: String(setting.value),
    };

    return waitForTurn(this.requestGate, this.isLoadingSignal)
      .pipe(
        switchMap((release: VoidFunction) => this.httpClient.post<JsonApi<ApiSetting[]>>(url, body)
          .pipe(
            catchError((error) => {
              release();
              return this.processError(error);
            }),
            finalize(release),
          )),
        switchMap(() => this.reloadList(skipReload)),
        map((settings: Setting[]) => this.findSetting(settings, setting)),
      );
  }

  public update(
    setting: Setting,
    skipReload: boolean = false,
  ): Observable<Setting> {
    const url: string = `${ environment['apiHost'] }${ environment['apiBase'] }/${ this.basePath }/${ setting.id }`;

    const body: ApiRequestBody = {
      id: setting.id,
      name: setting.name,
      value: String(setting.value),
    };

    return waitForTurn(this.requestGate, this.isLoadingSignal)
      .pipe(
        switchMap((release: VoidFunction) => this.httpClient.patch<JsonApi<ApiSetting[]>>(url, body)
          .pipe(
            catchError((error) => {
              release();
              return this.processError(error);
            }),
            finalize(release),
          )),
        switchMap(() => this.reloadList(skipReload)),
        map((settings: Setting[]) => this.findSetting(settings, setting)),
      );
  }

  public delete(
    setting: Setting,
  ): Observable<void> {
    const url: string = `${ environment['apiHost'] }${ environment['apiBase'] }/${ this.basePath }/${ setting.id }`;

    return waitForTurn(this.requestGate, this.isLoadingSignal)
      .pipe(
        switchMap((release: VoidFunction) => this.httpClient.delete<void>(url)
          .pipe(
            catchError((error) => {
              release();
              return this.processError(error);
            }),
            finalize(release),
          )),
        switchMap(
          () => this.list().pipe(take(1)),
        ),
        map(() => undefined),
      );
  }

  private reloadList(
    skipReload: boolean = false,
  ): Observable<Setting[]> {
    return (
      skipReload ?
        of(this.settings()) :
        this.list()
    )
      .pipe(take(1));
  }

  private findSetting(
    settings: Setting[],
    setting: Setting,
  ): Setting {
    const foundSetting: Setting | undefined = settings.find(
      (s: Setting) => (setting.id && s.id && s.id === setting.id) || s.name === setting.name,
    );

    if (!foundSetting) {
      throw new Error(`Problems creating setting "${ setting.name }"!`);
    }

    return foundSetting;
  }

  private processError(
    error: unknown,
  ): Observable<never> {
    return openLoadErrorDialog(
      this.loadErrorDialogService,
      this.isLoadingSignal,
      error,
      this.settings(),
    );
  }
}
