import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ApiRequestService } from './api-request.service';

describe('Shared Services api-request.service', () => {
  let service: ApiRequestService;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiRequestService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('builds api url', () => {
    expect(service.buildApiUrl('task', '/1')).toContain('/task/1');
  });

  it('sends get and maps requestData', async () => {
    const promise = firstValueFrom(service.requestData<string>('https://example.com/x'));
    http.expectOne('https://example.com/x').flush({ data: 'ok' });
    await expect(promise).resolves.toBe('ok');
  });

  it('supports post, patch and delete request methods', async () => {
    const postPromise = firstValueFrom(service.request('https://example.com/p', 'post', { a: 1 }));
    http.expectOne('https://example.com/p').flush({ ok: true });
    await expect(postPromise).resolves.toEqual({ ok: true });

    const patchPromise = firstValueFrom(service.request('https://example.com/q', 'patch', { b: 2 }));
    http.expectOne('https://example.com/q').flush({ ok: true });
    await expect(patchPromise).resolves.toEqual({ ok: true });

    const delPromise = firstValueFrom(service.request('https://example.com/r', 'delete'));
    http.expectOne('https://example.com/r').flush({ ok: true });
    await expect(delPromise).resolves.toEqual({ ok: true });
  });

  it('maps null when requestData has no data payload', async () => {
    const promise = firstValueFrom(service.requestData<null>('https://example.com/n'));
    http.expectOne('https://example.com/n').flush({});
    await expect(promise).resolves.toBeNull();
  });
});
