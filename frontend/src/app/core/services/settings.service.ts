import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';

import { catchError, finalize, map, Observable, of, switchMap, take, tap, throwError } from 'rxjs';

import { environment } from '@environments/environment';

import { adaptSettings } from '@core/adapters/api-setting.adapter';
import { ApiSetting } from '@core/interfaces/api/api-setting.interface';
import { JsonApi } from '@core/interfaces/json-api.interface';
import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { RequestGate, waitForTurn } from '@core/utils/wait-for.utility';

import { LoadableService } from '@shared/interfaces/loadable-service.interface';
import { ErrorDialogService } from '@shared/services/error-dialog.service';
import { ApiRequestBody } from '@shared/types/api-request-body.type';

@Injectable({
  providedIn: 'root',
})
export class SettingsService implements LoadableService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly errorDialogService: ErrorDialogService = inject(ErrorDialogService);

  private readonly isLoadingSignal = signal<boolean>(false);
  private readonly settingsSignal = signal<Setting[]>([]);
  private readonly requestGate = new RequestGate();

  private basePath = 'setting';

  public get isLoading(): Signal<boolean> {
    return this.isLoadingSignal.asReadonly();
  }

  public get settings(): Signal<Setting[]> {
    return this.settingsSignal.asReadonly();
  }

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
    this.isLoadingSignal.set(false);

    return this.errorDialogService.openDialog(
      {
        errorTitle: 'Error while doing db action :D',
        errorMessage: JSON.stringify(error),
        idbData: this.settings(),
      },
    )
      .pipe(
        take(1),
        switchMap(() => throwError(() => error)),
      );
  }
}
