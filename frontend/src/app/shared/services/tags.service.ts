import { HttpErrorResponse } from '@angular/common/http';
import { inject, injectAsync, Service, Signal, signal } from '@angular/core';

import { catchError, finalize, from, map, Observable, of, switchMap, take, tap, throwError } from 'rxjs';

import { JsonApi } from '@core/interfaces/json-api.interface';
import { LoaderStateService } from '@core/services/loader-state.service';
import { RequestGate } from '@core/utils/request-gate.utility';
import { waitForTurn } from '@core/utils/wait-for.utility';

import { adaptTag, adaptTags } from '@shared/adapters/api-tag.adapter';
import { ApiTag } from '@shared/interfaces/api/api-tag.interface';
import { LoadableService } from '@shared/interfaces/loadable-service.interface';
import { MakeRequestService } from '@shared/interfaces/make-request-service.interface';
import { Tag } from '@shared/models/tag.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import { ApiRequestBody } from '@shared/types/api-request-body.type';

@Service()
export class TagsService implements LoadableService, MakeRequestService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly apiRequestService: ApiRequestService = inject(ApiRequestService);
  private readonly loadErrorDialogService = injectAsync(
    () => import('@shared/services/error-dialog.service').then((m) => m.ErrorDialogService),
  );

  private readonly tagsSignal = signal<Tag[]>([]);
  private readonly isLoadingSignal = signal<boolean>(false);
  private readonly preloadErrorSignal = signal<boolean>(false);
  public readonly isLoading: Signal<boolean> = this.isLoadingSignal.asReadonly();
  public readonly tags: Signal<Tag[]> = this.tagsSignal.asReadonly();
  public readonly preloadError: Signal<boolean> = this.preloadErrorSignal.asReadonly();
  private readonly requestGate = new RequestGate();

  private basePath: string = 'tag';

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading, this.constructor.name);
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

    return waitForTurn(this.requestGate, this.isLoadingSignal)
      .pipe(
        switchMap((release: VoidFunction) => request$
          .pipe(
            catchError((error: HttpErrorResponse) => {
              release();

              if (reportError) {
                return this.processError(error);
              }

              return throwError(() => error);
            }),
            finalize(release),
          )),
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

    return from(this.loadErrorDialogService())
      .pipe(
        switchMap((errorDialogService) => errorDialogService.openDialog({
          errorTitle: 'Error while doing db action :D',
          errorMessage: JSON.stringify(error),
          idbData: this.tags(),
        })),
        take(1),
        switchMap(() => throwError(() => error)),
      );
  }

}
