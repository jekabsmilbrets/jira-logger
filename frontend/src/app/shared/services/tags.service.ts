import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, Injector, Signal, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

import { catchError, filter, map, Observable, of, switchMap, take, tap, throwError } from 'rxjs';

import { JsonApi } from '@core/interfaces/json-api.interface';
import { LoaderStateService } from '@core/services/loader-state.service';

import { adaptTag, adaptTags } from '@shared/adapters/api-tag.adapter';
import { ApiTag } from '@shared/interfaces/api/api-tag.interface';
import { LoadableService } from '@shared/interfaces/loadable-service.interface';
import { MakeRequestService } from '@shared/interfaces/make-request-service.interface';
import { Tag } from '@shared/models/tag.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import { ErrorDialogService } from '@shared/services/error-dialog.service';
import { ApiRequestBody } from '@shared/types/api-request-body.type';

@Injectable({
  providedIn: 'root',
})
export class TagsService implements LoadableService, MakeRequestService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  public readonly isLoading$: Observable<boolean>;
  public readonly tags$: Observable<Tag[]>;
  public readonly preloadError$: Observable<boolean>;

  private readonly apiRequestService: ApiRequestService = inject(ApiRequestService);
  private readonly errorDialogService: ErrorDialogService = inject(ErrorDialogService);
  private readonly injector: Injector = inject(Injector);

  private readonly tagsSignal = signal<Tag[]>([]);
  private readonly isLoadingSignal = signal<boolean>(false);
  private readonly preloadErrorSignal = signal<boolean>(false);

  private basePath: string = 'tag';

  public get isLoading(): Signal<boolean> {
    return this.isLoadingSignal.asReadonly();
  }

  public get tags(): Signal<Tag[]> {
    return this.tagsSignal.asReadonly();
  }

  public get preloadError(): Signal<boolean> {
    return this.preloadErrorSignal.asReadonly();
  }

  constructor() {
    this.tags$ = toObservable(this.tags, { injector: this.injector });
    this.isLoading$ = toObservable(this.isLoading, { injector: this.injector });
    this.preloadError$ = toObservable(this.preloadError, { injector: this.injector });
  }

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading$, this.constructor.name);
  }

  public list(): Observable<Tag[]> {
    const url: string = this.apiRequestService.buildApiUrl(this.basePath);

    return this.makeRequest<JsonApi<ApiTag[]>>(
      url,
      'get',
      null,
      false,
    )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of({ data: [] });
          }
          return this.processError(error);
        }),
        map((response: JsonApi<ApiTag[]>) => (response.data && adaptTags(response.data)) as Tag[]),
        tap((tags: Tag[]) => this.tagsSignal.set(tags)),
      );
  }

  public preloadForInit(): Observable<Tag[]> {
    return this.list()
      .pipe(
        tap(() => this.preloadErrorSignal.set(false)),
        catchError(() => {
          this.tagsSignal.set([]);
          this.preloadErrorSignal.set(true);

          return of([]);
        }),
      );
  }

  public create(
    tag: Tag,
    skipReload: boolean = false,
  ): Observable<Tag> {
    const url: string = this.apiRequestService.buildApiUrl(this.basePath);

    const body: ApiRequestBody = {
      name: tag.name && tag.name.trim(),
    };

    return this.makeRequest<JsonApi<ApiTag>>(
      url,
      'post',
      body,
      true,
    )
      .pipe(
        map((response: JsonApi<ApiTag>) => (response.data && adaptTag(response.data)) as Tag),
        switchMap((createdTag: Tag) => this.reloadList(createdTag, skipReload) as Observable<Tag>),
      );
  }

  public update(
    tag: Tag,
    skipReload: boolean = false,
  ): Observable<Tag> {
    const url: string = this.apiRequestService.buildApiUrl(this.basePath, `/${ tag.id }`);

    const body: ApiRequestBody = {
      id: tag.id,
      name: tag.name && tag.name.trim(),
    };

    return this.makeRequest<JsonApi<ApiTag>>(
      url,
      'patch',
      body,
      true,
    )
      .pipe(
        map((response: JsonApi<ApiTag>) => (response.data && adaptTag(response.data)) as Tag),
        switchMap((updatedTag: Tag) => this.reloadList(updatedTag, skipReload) as Observable<Tag>),
      );
  }

  public delete(
    tag: Tag,
    skipReload: boolean = false,
  ): Observable<void> {
    const url: string = this.apiRequestService.buildApiUrl(this.basePath, `/${ tag.id }`);

    return this.makeRequest<void>(
      url,
      'delete',
      null,
      true,
    )
      .pipe(
        switchMap(() => this.reloadList(undefined, skipReload) as Observable<void>),
      );
  }

  public makeRequest<T>(
    url: string,
    method: 'get' | 'post' | 'patch' | 'delete' = 'get',
    body: ApiRequestBody | null = null,
    reportError: boolean = false,
  ): Observable<T> {
    const request$: Observable<T> = this.apiRequestService.request<T>(url, method, body);

    return this.waitForTurn()
      .pipe(
        switchMap(() => request$),
        catchError((error: HttpErrorResponse) => {
          if (reportError) {
            return this.processError(error);
          }

          this.isLoadingSignal.set(false);
          return throwError(() => error);
        }),
        tap(() => this.isLoadingSignal.set(false)),
      );
  }

  private reloadList(
    returnValue: Tag | undefined,
    skipReload: boolean = false,
  ): Observable<Tag | void> {
    const returnValue$: Observable<undefined | Tag> = of(returnValue);

    return skipReload ?
      returnValue$ :
      this.list()
        .pipe(
          take(1),
          switchMap(() => returnValue$),
        );
  }

  private processError(
    error: HttpErrorResponse,
  ): Observable<never> {
    this.isLoadingSignal.set(false);

    return this.errorDialogService.openDialog({
      errorTitle: 'Error while doing db action :D',
      errorMessage: JSON.stringify(error),
      idbData: this.tags(),
    })
      .pipe(
        take(1),
        switchMap(() => throwError(() => error)),
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
