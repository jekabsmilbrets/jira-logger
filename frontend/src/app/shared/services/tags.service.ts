import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { JsonApi } from '@core/interfaces/json-api.interface';
import { LoaderStateService } from '@core/services/loader-state.service';
import { waitForTurn } from '@core/utils/wait-for.utility';

import { adaptTag, adaptTags } from '@shared/adapters/api-tag.adapter';
import { ApiTag } from '@shared/interfaces/api/api-tag.interface';
import { LoadableService } from '@shared/interfaces/loadable-service.interface';
import { MakeRequestService } from '@shared/interfaces/make-request-service.interface';
import { Tag } from '@shared/models/tag.model';
import { ErrorDialogService } from '@shared/services/error-dialog.service';
import { ApiRequestBody } from '@shared/types/api-request-body.type';

import { environment } from 'environments/environment';

import { BehaviorSubject, catchError, map, Observable, of, switchMap, take, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TagsService implements LoadableService, MakeRequestService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  public isLoading$: Observable<boolean>;
  public tags$: Observable<Tag[]>;

  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly errorDialogService: ErrorDialogService = inject(ErrorDialogService);

  private tagsSubject: BehaviorSubject<Tag[]> = new BehaviorSubject<Tag[]>([]);

  private basePath: string = 'tag';

  private isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() {
    this.tags$ = this.tagsSubject.asObservable();
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  public init(): void {
    this.loaderStateService.addLoader(this.isLoading$, this.constructor.name);
  }

  public list(): Observable<Tag[]> {
    const url: string = `${ environment['apiHost'] }${ environment['apiBase'] }/${ this.basePath }`;

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
        tap((tags: Tag[]) => this.tagsSubject.next(tags)),
      );
  }

  public create(
    tag: Tag,
    skipReload: boolean = false,
  ): Observable<Tag> {
    const url: string = `${ environment['apiHost'] }${ environment['apiBase'] }/${ this.basePath }`;

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
    const url: string = `${ environment['apiHost'] }${ environment['apiBase'] }/${ this.basePath }/${ tag.id }`;

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
    const url: string = `${ environment['apiHost'] }${ environment['apiBase'] }/${ this.basePath }/${ tag.id }`;

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
    let request$: Observable<T>;

    switch (method) {
      case 'post':
        request$ = this.httpClient.post<T>(url, body);
        break;

      case 'patch':
        request$ = this.httpClient.patch<T>(url, body);
        break;

      case 'delete':
        request$ = this.httpClient.delete<T>(url);
        break;

      case 'get':
      default:
        request$ = this.httpClient.get<T>(url);
        break;
    }

    return waitForTurn(
      this.isLoading$,
      this.isLoadingSubject,
    )
      .pipe(
        switchMap(() => request$),
        catchError((error: HttpErrorResponse) => {
          if (reportError) {
            return this.processError(error);
          }

          this.isLoadingSubject.next(false);
          return throwError(() => error);
        }),
        tap(() => this.isLoadingSubject.next(false)),
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
    this.isLoadingSubject.next(false);

    return this.tags$.pipe(
      take(1),
      switchMap(
        (tags: Tag[]) => this.errorDialogService.openDialog({
          errorTitle: 'Error while doing db action :D',
          errorMessage: JSON.stringify(error),
          idbData: tags,
        }),
      ),
      take(1),
      switchMap(() => throwError(() => error)),
    );
  }
}
