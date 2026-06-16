import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';

import { map, type Observable } from 'rxjs';

import { environment } from '@environments/environment';

import type { JsonApi } from '@core/interfaces/json-api.interface';

import type { ApiRequestBody } from '@shared/types/api-request-body.type';

@Service()
export class ApiRequestService {
  private readonly httpClient: HttpClient = inject(HttpClient);

  public buildApiUrl(
    resourcePath: string,
    suffix: string = '',
  ): string {
    const baseUrl: string = `${ environment['apiHost'] }${ environment['apiBase'] }`;

    return `${ baseUrl }/${ resourcePath }${ suffix }`;
  }

  public request<T>(
    url: string,
    method: 'get' | 'post' | 'patch' | 'delete' = 'get',
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

  public requestData<TData>(
    url: string,
    method: 'get' | 'post' | 'patch' | 'delete' = 'get',
    body: ApiRequestBody | null = null,
  ): Observable<TData> {
    return this.request<JsonApi<TData>>(url, method, body)
      .pipe(
        map((response: JsonApi<TData>) => (response.data ?? null) as TData),
      );
  }
}
