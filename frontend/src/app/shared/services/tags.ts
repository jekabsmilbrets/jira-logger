import { HttpErrorResponse } from '@angular/common/http';
import { inject, injectAsync, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, map, type Observable, of, switchMap, take, tap } from 'rxjs';

import { LoaderState } from '@core/services/loader-state';

import { adaptTag, adaptTags } from '@shared/adapters/api-tag.adapter';
import type { ApiTag } from '@shared/interfaces/api/api-tag.interface';
import type { ResourceRequestHandle } from '@shared/interfaces/resource-request-handle.interface';
import { Tag } from '@shared/models/tag.model';
import { ApiRequest } from '@shared/services/api-request';
import type { ErrorDialog } from '@shared/services/error-dialog';
import type { ApiRequestBody } from '@shared/types/api-request-body.type';
import type { AsyncLoader } from '@shared/types/async-loader.type';
import { openLoadErrorDialog } from '@shared/utilities/open-load-error-dialog.utility';

@Service()
export class Tags {
  public readonly loaderStateService: LoaderState = inject(LoaderState);

  private readonly apiRequestService: ApiRequest = inject(ApiRequest);
  private readonly tagResource: ResourceRequestHandle = this.apiRequestService.resource('tag');
  private readonly loadErrorDialogService: AsyncLoader<ErrorDialog> = injectAsync(
    () => import('@shared/services/error-dialog').then((m) => m.ErrorDialog),
  );

  private readonly tagsSignal: WritableSignal<Tag[]> = signal<Tag[]>([]);
  private readonly preloadErrorSignal: WritableSignal<boolean> = signal<boolean>(false);

  public readonly isLoading: Signal<boolean> = this.tagResource.isLoading;
  public readonly tags: Signal<Tag[]> = this.tagsSignal.asReadonly();
  public readonly preloadError: Signal<boolean> = this.preloadErrorSignal.asReadonly();

  public init(): void {
    this.loaderStateService.addLoader(
      this.isLoading,
      'Tags',
    );

    this.preloadForInit()
      .pipe(take(1))
      .subscribe();
  }

  public list(): Observable<Tag[]> {
    return this.tagResource.listRequest<ApiTag>()
      .pipe(
        catchError((error: HttpErrorResponse) => this.processError(error)),
        map((tags: ApiTag[]) => adaptTags(tags)),
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
    const body: ApiRequestBody = {
      name: tag.name && tag.name.trim(),
    };

    return this.tagResource.dataRequest<ApiTag>(
      '',
      'post',
      body,
      (error: unknown) => this.processError(error as HttpErrorResponse),
    )
      .pipe(
        map((tag: ApiTag) => adaptTag(tag)),
        switchMap((createdTag: Tag) => this.reloadList(createdTag, skipReload) as Observable<Tag>),
      );
  }

  public update(
    tag: Tag,
    skipReload: boolean = false,
  ): Observable<Tag> {
    const body: ApiRequestBody = {
      id: tag.id,
      name: tag.name && tag.name.trim(),
    };

    return this.tagResource.dataRequest<ApiTag>(
      `/${ tag.id }`,
      'patch',
      body,
      (error: unknown) => this.processError(error as HttpErrorResponse),
    )
      .pipe(
        map((tag: ApiTag) => adaptTag(tag)),
        switchMap((updatedTag: Tag) => this.reloadList(updatedTag, skipReload) as Observable<Tag>),
      );
  }

  public delete(
    tag: Tag,
    skipReload: boolean = false,
  ): Observable<void> {
    return this.tagResource.request<void>(
      `/${ tag.id }`,
      'delete',
      null,
      (error: unknown) => this.processError(error as HttpErrorResponse),
    )
      .pipe(
        switchMap(() => this.reloadList(undefined, skipReload) as Observable<void>),
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
      error,
      this.tags(),
    );
  }

}
