import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { adaptSettings } from '@core/adapters/api-setting.adapter';
import { ApiSetting } from '@core/interfaces/api/api-setting.interface';
import { JsonApi } from '@core/interfaces/json-api.interface';
import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';
import { waitForTurn } from '@core/utils/wait-for.utility';

import { LoadableService } from '@shared/interfaces/loadable-service.interface';
import { ErrorDialogService } from '@shared/services/error-dialog.service';

import { BehaviorSubject, catchError, map, Observable, of, switchMap, take, tap, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SettingsService implements LoadableService {
  public isLoading$: Observable<boolean>;

  public settings$: Observable<Setting[]>;

  private isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  private settingsSubject: BehaviorSubject<Setting[]> = new BehaviorSubject<Setting[]>([]);

  private basePath = 'setting';

  constructor(
    public readonly loaderStateService: LoaderStateService,
    private http: HttpClient,
    private errorDialogService: ErrorDialogService,
  ) {
    this.isLoading$ = this.isLoadingSubject.asObservable();
    this.settings$ = this.settingsSubject.asObservable();
  }

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading$, this.constructor.name);
    this.list()
      .pipe(take(1))
      .subscribe();
  }

  public list(): Observable<Setting[]> {
    const url = `${ environment.apiHost }${ environment.apiBase }/${ this.basePath }`;

    return this.waitForTurn()
      .pipe(
        switchMap(() => this.http.get<JsonApi<ApiSetting[]>>(url)),
        catchError((error: HttpErrorResponse) => {
          this.isLoadingSubject.next(false);
          if (error.status === 404) {
            return of({ data: [] });
          }
          return this.processError(error);
        }),
        map(
          (response: JsonApi<ApiSetting[]>) => (response.data && adaptSettings(response.data)) as Setting[],
        ),
        tap((tasks: Setting[]) => this.settingsSubject.next(tasks)),
        tap(() => this.isLoadingSubject.next(false)),
      );
  }

  public create(setting: Setting, skipReload: boolean = false): Observable<Setting> {
    const url = `${ environment.apiHost }${ environment.apiBase }/${ this.basePath }`;

    const body = {
      name: setting.name,
      value: String(setting.value),
    };

    return this.waitForTurn()
      .pipe(
        switchMap(() => this.http.post<JsonApi<ApiSetting[]>>(url, body)),
        catchError((error) => this.processError(error)),
        tap(() => this.isLoadingSubject.next(false)),
        switchMap(() => this.reloadList(skipReload)),
        map((settings: Setting[]) => this.findSetting(settings, setting)),
      );
  }

  public update(setting: Setting, skipReload: boolean = false): Observable<Setting> {
    const url = `${ environment.apiHost }${ environment.apiBase }/${ this.basePath }/${ setting.id }`;

    const body = {
      id: setting.id,
      name: setting.name,
      value: String(setting.value),
    };

    return this.waitForTurn()
      .pipe(
        switchMap(() => this.http.patch<JsonApi<ApiSetting[]>>(url, body)),
        catchError((error) => this.processError(error)),
        tap(() => this.isLoadingSubject.next(false)),
        switchMap(() => this.reloadList(skipReload)),
        map((settings: Setting[]) => this.findSetting(settings, setting)),
      );
  }

  public delete(setting: Setting): Observable<void> {
    const url = `${ environment.apiHost }${ environment.apiBase }/${ this.basePath }/${ setting.id }`;

    return this.waitForTurn()
      .pipe(
        switchMap(() => this.http.delete<void>(url)),
        catchError((error) => this.processError(error)),
        tap(() => this.isLoadingSubject.next(false)),
        switchMap(
          () => this.list().pipe(take(1)),
        ),
        map(() => undefined),
      );
  }

  private waitForTurn(): Observable<boolean> {
    return waitForTurn(this.isLoading$, this.isLoadingSubject);
  }

  private reloadList(skipReload: boolean = false): Observable<Setting[]> {
    return skipReload ?
      this.settings$.pipe(take(1)) :
      this.list().pipe(take(1));
  }

  private findSetting(settings: Setting[], setting: Setting): Setting {
    const foundSetting: Setting | undefined = settings.find(
      (s: Setting) => (setting.id && s.id && s.id === setting.id) || s.name === setting.name,
    );

    if (!foundSetting) {
      throw new Error(`Problems creating setting "${ setting.name }"!`);
    }

    return foundSetting;
  }

  private processError(error: any): Observable<never> {
    this.isLoadingSubject.next(false);

    return this.settings$
      .pipe(
        take(1),
        switchMap(
          (settings: Setting[]) => this.errorDialogService.openDialog(
            {
              errorTitle: 'Error while doing db action :D',
              errorMessage: JSON.stringify(error),
              idbData: settings,
            },
          ),
        ),
        take(1),
        switchMap(() => throwError(() => error)),
      );
  }
}
