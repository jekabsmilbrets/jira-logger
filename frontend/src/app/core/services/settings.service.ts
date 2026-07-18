import { type HttpErrorResponse } from '@angular/common/http';
import { inject, injectAsync, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, map, type Observable, of, switchMap, take, tap } from 'rxjs';

import { adaptSettings } from '@core/adapters/api-setting.adapter';
import type { ApiSetting } from '@core/interfaces/api/api-setting.interface';
import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';

import type { ResourceRequestHandle } from '@shared/interfaces/resource-request-handle.interface';
import { ApiRequestService } from '@shared/services/api-request.service';
import type { ErrorDialogService } from '@shared/services/error-dialog.service';
import type { ApiRequestBody } from '@shared/types/api-request-body.type';
import type { AsyncLoader } from '@shared/types/async-loader.type';
import { openLoadErrorDialog } from '@shared/utilities/open-load-error-dialog.utility';

@Service()
export class SettingsService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly apiRequestService: ApiRequestService = inject(ApiRequestService);
  private readonly settingResource: ResourceRequestHandle = this.apiRequestService.resource('setting');
  private readonly loadErrorDialogService: AsyncLoader<ErrorDialogService> = injectAsync(
    () => import('@shared/services/error-dialog.service').then((m) => m.ErrorDialogService),
  );

  private readonly settingsSignal: WritableSignal<Setting[]> = signal<Setting[]>([]);

  public readonly isLoading: Signal<boolean> = this.settingResource.isLoading;
  public readonly settings: Signal<Setting[]> = this.settingsSignal.asReadonly();

  public init(): void {
    this.loaderStateService.addLoader(
      this.isLoading,
      'SettingsService',
    );
    this.list()
      .pipe(take(1))
      .subscribe();
  }

  public list(): Observable<Setting[]> {
    return this.settingResource.listRequest<ApiSetting>(
      '',
      'get',
      null,
    )
      .pipe(
        catchError((error: HttpErrorResponse) => this.processError(error)),
        map((settings: ApiSetting[]) => adaptSettings(settings)),
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

    return this.settingResource.request(
      '',
      'post',
      body,
      (error: unknown) => this.processError(error),
    )
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

    return this.settingResource.request(
      `/${ setting.id }`,
      'patch',
      body,
      (error: unknown) => this.processError(error),
    )
      .pipe(
        switchMap(() => this.reloadList(skipReload)),
        map((settings: Setting[]) => this.findSetting(settings, setting)),
      );
  }

  public delete(
    setting: Setting,
  ): Observable<void> {
    return this.settingResource.request<void>(
      `/${ setting.id }`,
      'delete',
      null,
      (error: unknown) => this.processError(error),
    )
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
      error,
      this.settings(),
    );
  }
}
