import { type HttpErrorResponse } from '@angular/common/http';
import { inject, injectAsync, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, map, type Observable, of, switchMap, take, tap } from 'rxjs';

import { adaptSettings } from '@core/adapters/api-setting.adapter';
import type { ApiSetting } from '@core/interfaces/api/api-setting.interface';
import type { JsonApi } from '@core/interfaces/json-api.interface';
import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { RequestGate } from '@core/utilities/request-gate.utility';

import type { LoadableService } from '@shared/interfaces/loadable-service.interface';
import { ApiRequestService } from '@shared/services/api-request.service';
import type { ErrorDialogService } from '@shared/services/error-dialog.service';
import type { ApiRequestBody } from '@shared/types/api-request-body.type';
import type { AsyncLoader } from '@shared/types/async-loader.type';
import { openLoadErrorDialog } from '@shared/utilities/open-load-error-dialog.utility';

@Service()
export class SettingsService implements LoadableService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly apiRequestService: ApiRequestService = inject(ApiRequestService);
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
    return this.makeRequest<JsonApi<ApiSetting[]>>('', 'get', null, false)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of({ data: [] });
          }

          return this.processError(error);
        }),
        map(
          (response: JsonApi<ApiSetting[]>) => (response.data && adaptSettings(response.data)) as Setting[],
        ),
        tap((tasks: Setting[]) => this.settingsSignal.set(tasks)),
      );
  }

  public create(
    setting: Setting,
    skipReload: boolean = false,
  ): Observable<Setting> {
    const body: ApiRequestBody = {
      name: setting.name,
      value: String(setting.value),
    };

    return this.makeRequest<JsonApi<ApiSetting[]>>('', 'post', body, true)
      .pipe(
        switchMap(() => this.reloadList(skipReload)),
        map((settings: Setting[]) => this.findSetting(settings, setting)),
      );
  }

  public update(
    setting: Setting,
    skipReload: boolean = false,
  ): Observable<Setting> {
    const body: ApiRequestBody = {
      id: setting.id,
      name: setting.name,
      value: String(setting.value),
    };

    return this.makeRequest<JsonApi<ApiSetting[]>>(`/${ setting.id }`, 'patch', body, true)
      .pipe(
        switchMap(() => this.reloadList(skipReload)),
        map((settings: Setting[]) => this.findSetting(settings, setting)),
      );
  }

  public delete(
    setting: Setting,
  ): Observable<void> {
    return this.makeRequest<void>(`/${ setting.id }`, 'delete', null, true)
      .pipe(
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

  private makeRequest<T>(
    url: string,
    method: 'get' | 'post' | 'patch' | 'delete' = 'get',
    body: ApiRequestBody | null = null,
    reportError: boolean = false,
  ): Observable<T> {
    return this.apiRequestService.resourceRequest<T>(
      this.basePath,
      url,
      this.requestGate,
      this.isLoadingSignal,
      method,
      body,
      reportError ?
        (error: unknown) => this.processError(error) as Observable<T> :
        undefined,
    );
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
