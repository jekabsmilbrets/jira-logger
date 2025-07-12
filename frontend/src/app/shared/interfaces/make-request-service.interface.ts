import { Observable } from 'rxjs';

export interface MakeRequestService {
  makeRequest<T>(
    url: string,
    method: 'get' | 'post' | 'patch' | 'delete',
    body: any,
    reportError: boolean,
  ): Observable<T>;
}
