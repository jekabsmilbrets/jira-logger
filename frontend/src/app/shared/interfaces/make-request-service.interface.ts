import { ApiRequestBody } from '@shared/types/api-request-body.type';
import { Observable } from 'rxjs';

export interface MakeRequestService {
  makeRequest<T>(
    url: string,
    method: 'get' | 'post' | 'patch' | 'delete',
    body: ApiRequestBody | null,
    reportError: boolean,
  ): Observable<T>;
}
