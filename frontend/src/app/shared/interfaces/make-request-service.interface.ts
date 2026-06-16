import { Observable } from 'rxjs';

import type { ApiRequestBody } from '@shared/types/api-request-body.type';

export interface MakeRequestService {
  makeRequest<T>(
    url: string,
    method: 'get' | 'post' | 'patch' | 'delete',
    body: ApiRequestBody | null,
    reportError: boolean,
  ): Observable<T>;
}
