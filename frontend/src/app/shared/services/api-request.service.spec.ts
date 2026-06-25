import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { RequestGate } from '@core/utilities/request-gate.utility';

import { ApiRequestService } from './api-request.service';

describe('Shared Services api-request.service', () => {
  let service: ApiRequestService;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
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

  it('runs resource requests through the shared resource seam', async () => {
    const isLoading = signal(false);
    const promise = firstValueFrom(service.resourceRequest<{ ok: boolean }>(
      'task',
      '/1',
      new RequestGate(),
      isLoading,
      'patch',
      { name: 'A' },
    ));

    expect(isLoading()).toBe(true);
    const req = http.expectOne((request) => request.url.includes('/task/1') && request.method === 'PATCH');
    expect(req.request.body).toEqual({ name: 'A' });
    req.flush({ ok: true });

    await expect(promise).resolves.toEqual({ ok: true });
    expect(isLoading()).toBe(false);
  });
});
