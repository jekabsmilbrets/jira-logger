import { signal, type WritableSignal } from '@angular/core';

import { catchError, map, type Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import type { JsonApi } from '@core/interfaces/json-api.interface';

import type { ApiRequestMethod, ResourceRequestHandle, ResourceRequestPath } from '@shared/interfaces/resource-request-handle.interface';
import type { ApiRequestBody } from '@shared/types/api-request-body.type';

type ResourceRequestMock = ReturnType<typeof vi.fn> & (<T>(
  url: string,
  method: ApiRequestMethod,
  body: ApiRequestBody | null,
) => Observable<T>);

type ResourceFactoryMock = ReturnType<typeof vi.fn> & ((
  base: ResourceRequestPath,
) => ResourceRequestHandle);

export interface ResourceRequestHandleMock {
  isLoadingSignal: WritableSignal<boolean>;
  request: ResourceRequestMock;
  resource: ResourceFactoryMock;
}

export const createResourceRequestHandleMock: () => ResourceRequestHandleMock = (): ResourceRequestHandleMock => {
  const isLoadingSignal: WritableSignal<boolean> = signal(false);
  const request: ResourceRequestMock = vi.fn() as ResourceRequestMock;
  const resource: ResourceFactoryMock = vi.fn((base: ResourceRequestPath): ResourceRequestHandle => ({
    isLoading: isLoadingSignal.asReadonly(),
    request: <T>(
      suffix: string = '',
      method: ApiRequestMethod = 'get',
      body: ApiRequestBody | null = null,
      processError?: (error: unknown) => Observable<T>,
    ) => request<T>(buildResourceUrl(base, suffix), method, body)
      .pipe(catchError((error: unknown) => processError ? processError(error) : throwError(() => error))),
    dataRequest: <TData>(
      suffix: string = '',
      method: ApiRequestMethod = 'get',
      body: ApiRequestBody | null = null,
      processError?: (error: unknown) => Observable<JsonApi<TData>>,
    ) => request<JsonApi<TData>>(buildResourceUrl(base, suffix), method, body)
      .pipe(
        catchError((error: unknown) => processError ? processError(error) : throwError(() => error)),
        map((response: JsonApi<TData>) => (response.data ?? null) as TData),
      ),
    listRequest: <TData>(
      suffix: string = '',
      method: ApiRequestMethod = 'get',
      body: ApiRequestBody | null = null,
      processError?: (error: unknown) => Observable<JsonApi<TData[]>>,
    ) => request<JsonApi<TData[]>>(buildResourceUrl(base, suffix), method, body)
      .pipe(
        catchError((error: unknown) => {
          if (processError) {
            return processError(error);
          }

          if (isNotFoundError(error)) {
            return of({ data: [] });
          }

          return throwError(() => error);
        }),
        map((response: JsonApi<TData[]>) => response.data ?? []),
      ),
  }));

  return {
    isLoadingSignal,
    request,
    resource,
  };
};

const buildResourceUrl: (
  base: ResourceRequestPath,
  suffix?: string,
) => string = (
  base: ResourceRequestPath,
  suffix: string = '',
): string => {
  if (typeof base === 'string') {
    return `https://api/${ base }${ suffix }`;
  }

  const resourceSuffix: string = base.suffix ?? '';
  const secondSlashIndex: number = suffix.indexOf('/', 1);
  const normalizedSuffix: string = resourceSuffix && secondSlashIndex >= 0 ?
    `${ suffix.slice(0, secondSlashIndex) }${ resourceSuffix }${ suffix.slice(secondSlashIndex) }` :
    `${ suffix }${ resourceSuffix }`;

  return `https://api/${ base.resourcePath }${ normalizedSuffix }`;
};

const isNotFoundError: (error: unknown) => boolean = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  error.status === 404;
