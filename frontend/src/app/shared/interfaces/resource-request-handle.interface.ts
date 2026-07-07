import type { Signal } from '@angular/core';

import type { Observable } from 'rxjs';

import type { JsonApi } from '@core/interfaces/json-api.interface';

import type { ApiRequestBody } from '@shared/types/api-request-body.type';

export type ApiRequestMethod = 'get' | 'post' | 'patch' | 'delete';

export type ResourceRequestPath =
  | string
  | {
  resourcePath: string;
  suffix?: string;
};

export interface ResourceRequestHandle {
  readonly isLoading: Signal<boolean>;

  request<T>(
    suffix?: string,
    method?: ApiRequestMethod,
    body?: ApiRequestBody | null,
    processError?: (error: unknown) => Observable<T>,
  ): Observable<T>;

  dataRequest<TData>(
    suffix?: string,
    method?: ApiRequestMethod,
    body?: ApiRequestBody | null,
    processError?: (error: unknown) => Observable<JsonApi<TData>>,
  ): Observable<TData>;

  listRequest<TData>(
    suffix?: string,
    method?: ApiRequestMethod,
    body?: ApiRequestBody | null,
    processError?: (error: unknown) => Observable<JsonApi<TData[]>>,
  ): Observable<TData[]>;
}
