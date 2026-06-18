import { HttpErrorResponse } from '@angular/common/http';
import { inject, injectAsync, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, map, type Observable, of, switchMap, take, tap } from 'rxjs';

import type { JsonApi } from '@core/interfaces/json-api.interface';
import { LoaderStateService } from '@core/services/loader-state.service';
import { RequestGate } from '@core/utilities/request-gate.utility';
import { runGatedRequest } from '@core/utilities/run-gated-request.utility';

import { adaptTag, adaptTags } from '@shared/adapters/api-tag.adapter';
import type { ApiTag } from '@shared/interfaces/api/api-tag.interface';
import type { LoadableService } from '@shared/interfaces/loadable-service.interface';
import type { MakeRequestService } from '@shared/interfaces/make-request-service.interface';
import { Tag } from '@shared/models/tag.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import type { ErrorDialogService } from '@shared/services/error-dialog.service';
import type { ApiRequestBody } from '@shared/types/api-request-body.type';
import type { AsyncLoader } from '@shared/types/async-loader.type';
import { openLoadErrorDialog } from '@shared/utilities/open-load-error-dialog.utility';

@Service()
export class TagsService implements LoadableService, MakeRequestService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  private readonly apiRequestService: ApiRequestService = inject(ApiRequestService);
  private readonly loadErrorDialogService: AsyncLoader<ErrorDialogService> = injectAsync(
    () => import('@shared/services/error-dialog.service').then((m) => m.ErrorDialogService),
  );

  private readonly tagsSignal: WritableSignal<Tag[]> = signal<Tag[]>([]);
  private readonly isLoadingSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly preloadErrorSignal: WritableSignal<boolean> = signal<boolean>(false);

  public readonly isLoading: Signal<boolean> = this.isLoadingSignal.asReadonly();
  public readonly tags: Signal<Tag[]> = this.tagsSignal.asReadonly();
  public readonly preloadError: Signal<boolean> = this.preloadErrorSignal.asReadonly();
  private readonly requestGate: RequestGate = new RequestGate();

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

    return runGatedRequest(
      this.requestGate,
      this.isLoadingSignal,
      request$,
      reportError ?
        (error: unknown) => this.processError(error as HttpErrorResponse) as Observable<T> :
        undefined,
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
    return openLoadErrorDialog(
      this.loadErrorDialogService,
      this.isLoadingSignal,
      error,
      this.tags(),
    );
  }

}
