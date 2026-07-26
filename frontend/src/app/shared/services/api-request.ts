import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { catchError, finalize, map, type Observable, of, switchMap, throwError } from 'rxjs';

import { environment } from '@environments/environment';

import type { JsonApi } from '@core/interfaces/json-api.interface';
import { RequestGate } from '@core/utilities/request-gate.utility';
import { waitForTurn } from '@core/utilities/wait-for.utility';

import type { ApiRequestMethod, ResourceRequestHandle, ResourceRequestPath } from '@shared/interfaces/resource-request-handle.interface';
import type { ApiRequestBody } from '@shared/types/api-request-body.type';

interface ResourceRequestState {
  requestGate: RequestGate;
  isLoadingSignal: WritableSignal<boolean>;
  isLoading: Signal<boolean>;
}

interface NormalizedResourceRequestPath {
  resourcePath: string;
  suffix: string;
}

@Service()
export class ApiRequest {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly resourceStates: Map<string, ResourceRequestState> = new Map<string, ResourceRequestState>();

  public resource(
    resourcePath: ResourceRequestPath,
  ): ResourceRequestHandle {
    const normalizedResourcePath: NormalizedResourceRequestPath = this.normalizeResourcePath(resourcePath);
    const state: ResourceRequestState = this.getResourceState(
      this.buildResourceStateKey(normalizedResourcePath),
    );

    return {
      isLoading: state.isLoading,
      request: <T>(
        suffix: string = '',
        method: ApiRequestMethod = 'get',
        body: ApiRequestBody | null = null,
        processError?: (error: unknown) => Observable<T>,
      ): Observable<T> => this.runResourceRequest<T>(
        normalizedResourcePath,
        suffix,
        state,
        method,
        body,
        processError,
      ),
      dataRequest: <TData>(
        suffix: string = '',
        method: ApiRequestMethod = 'get',
        body: ApiRequestBody | null = null,
        processError?: (error: unknown) => Observable<JsonApi<TData>>,
      ): Observable<TData> => this.runResourceRequest<JsonApi<TData>>(
        normalizedResourcePath,
        suffix,
        state,
        method,
        body,
        processError,
      )
        .pipe(
          map((response: JsonApi<TData>) => (response.data ?? null) as TData),
        ),
      listRequest: <TData>(
        suffix: string = '',
        method: ApiRequestMethod = 'get',
        body: ApiRequestBody | null = null,
        processError?: (error: unknown) => Observable<JsonApi<TData[]>>,
      ): Observable<TData[]> => this.runResourceRequest<JsonApi<TData[]>>(
        normalizedResourcePath,
        suffix,
        state,
        method,
        body,
        processError,
      )
        .pipe(
          catchError((error: unknown) => this.isNotFoundError(error) ?
            of({ data: [] }) :
            throwError(() => error)),
          map((response: JsonApi<TData[]>) => response.data ?? []),
        ),
    };
  }

  private buildApiUrl(
    resourcePath: string,
    suffix: string = '',
  ): string {
    const baseUrl: string = `${ environment['apiHost'] }${ environment['apiBase'] }`;

    return `${ baseUrl }/${ resourcePath }${ suffix }`;
  }

  private request<T>(
    url: string,
    method: ApiRequestMethod = 'get',
    body: ApiRequestBody | null = null,
  ): Observable<T> {
    switch (method) {
      case 'post':
        return this.httpClient.post<T>(url, body);
      case 'patch':
        return this.httpClient.patch<T>(url, body);
      case 'delete':
        return this.httpClient.delete<T>(url);
      case 'get':
      default:
        return this.httpClient.get<T>(url);
    }
  }

  private getResourceState(
    resourceStateKey: string,
  ): ResourceRequestState {
    const existingState: ResourceRequestState | undefined = this.resourceStates.get(resourceStateKey);

    if (existingState) {
      return existingState;
    }

    const isLoadingSignal: WritableSignal<boolean> = signal<boolean>(false);
    const state: ResourceRequestState = {
      requestGate: new RequestGate(),
      isLoadingSignal,
      isLoading: isLoadingSignal.asReadonly(),
    };

    this.resourceStates.set(resourceStateKey, state);

    return state;
  }

  private runResourceRequest<T>(
    resourcePath: NormalizedResourceRequestPath,
    suffix: string,
    state: ResourceRequestState,
    method: ApiRequestMethod = 'get',
    body: ApiRequestBody | null = null,
    processError?: (error: unknown) => Observable<T>,
  ): Observable<T> {
    return waitForTurn(
      state.requestGate,
      state.isLoadingSignal,
    )
      .pipe(
        switchMap((release: VoidFunction) => this.request<T>(
          this.buildApiUrl(
            resourcePath.resourcePath,
            this.buildResourceRequestSuffix(resourcePath.suffix, suffix),
          ),
          method,
          body,
        )
          .pipe(
            catchError((error: unknown) => {
              release();

              if (processError) {
                return processError(error);
              }

              return throwError(() => error);
            }),
            finalize(release),
          )),
      );
  }

  private isNotFoundError(
    error: unknown,
  ): boolean {
    if (error instanceof HttpErrorResponse) {
      return error.status === 404;
    }

    return typeof error === 'object'
      && error !== null
      && 'status' in error
      && error.status === 404;
  }

  private normalizeResourcePath(
    resourcePath: ResourceRequestPath,
  ): NormalizedResourceRequestPath {
    if (typeof resourcePath === 'string') {
      return {
        resourcePath,
        suffix: '',
      };
    }

    return {
      resourcePath: resourcePath.resourcePath,
      suffix: resourcePath.suffix ?? '',
    };
  }

  private buildResourceStateKey(
    resourcePath: NormalizedResourceRequestPath,
  ): string {
    return `${ resourcePath.resourcePath }${ resourcePath.suffix }`;
  }

  private buildResourceRequestSuffix(
    resourceSuffix: string,
    requestSuffix: string,
  ): string {
    if (!resourceSuffix) {
      return requestSuffix;
    }

    if (!requestSuffix) {
      return resourceSuffix;
    }

    const secondSlashIndex: number = requestSuffix.indexOf('/', 1);

    if (!requestSuffix.startsWith('/') || secondSlashIndex < 0) {
      return `${ requestSuffix }${ resourceSuffix }`;
    }

    return `${ requestSuffix.slice(0, secondSlashIndex) }${ resourceSuffix }${ requestSuffix.slice(secondSlashIndex) }`;
  }
}
