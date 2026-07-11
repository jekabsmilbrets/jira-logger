import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom, of, throwError } from 'rxjs';

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

  it('supports post, patch and delete request methods', async () => {
    const resource = service.resource('task');

    const postPromise = firstValueFrom(resource.request('/p', 'post', { a: 1 }));
    http.expectOne((request) => request.url.includes('/task/p') && request.method === 'POST').flush({ ok: true });
    await expect(postPromise).resolves.toEqual({ ok: true });

    const patchPromise = firstValueFrom(resource.request('/q', 'patch', { b: 2 }));
    http.expectOne((request) => request.url.includes('/task/q') && request.method === 'PATCH').flush({ ok: true });
    await expect(patchPromise).resolves.toEqual({ ok: true });

    const delPromise = firstValueFrom(resource.request('/r', 'delete'));
    http.expectOne((request) => request.url.includes('/task/r') && request.method === 'DELETE').flush({ ok: true });
    await expect(delPromise).resolves.toEqual({ ok: true });
  });

  it('creates resource handles with loading state and resource paths', async () => {
    const resource = service.resource('tag');
    const promise = firstValueFrom(resource.request<{ ok: boolean }>('/1', 'patch', { name: 'A' }));

    expect(resource.isLoading()).toBe(true);
    const req = http.expectOne((request) => request.url.includes('/tag/1') && request.method === 'PATCH');
    expect(req.request.body).toEqual({ name: 'A' });
    req.flush({ ok: true });

    await expect(promise).resolves.toEqual({ ok: true });
    expect(resource.isLoading()).toBe(false);
  });

  it('normalizes nested resource path requests', async () => {
    const resource = service.resource({
      resourcePath: 'task',
      suffix: '/time-log',
    });
    const promise = firstValueFrom(resource.request<{ ok: boolean }>('/task-1/log-1', 'patch', { description: 'A' }));

    const req = http.expectOne((request) => request.url.includes('/task/task-1/time-log/log-1') && request.method === 'PATCH');
    expect(req.request.body).toEqual({ description: 'A' });
    req.flush({ ok: true });

    await expect(promise).resolves.toEqual({ ok: true });
  });

  it('maps resource data requests to JSON data', async () => {
    const resource = service.resource('setting');
    const promise = firstValueFrom(resource.dataRequest<string>('/locale'));

    http.expectOne((request) => request.url.includes('/setting/locale')).flush({ data: 'lv-LV' });

    await expect(promise).resolves.toBe('lv-LV');
  });

  it('maps null when resource data request has no data payload', async () => {
    const resource = service.resource('setting');
    const promise = firstValueFrom(resource.dataRequest<null>('/missing-data'));

    http.expectOne((request) => request.url.includes('/setting/missing-data')).flush({});

    await expect(promise).resolves.toBeNull();
  });

  it('maps missing resource lists to empty arrays', async () => {
    const resource = service.resource('task');
    const promise = firstValueFrom(resource.listRequest('/missing'));

    http.expectOne((request) => request.url.includes('/task/missing')).flush('x', {
      status: 404,
      statusText: 'Not Found',
    });

    await expect(promise).resolves.toEqual([]);
  });

  it('passes resource errors to the provided processor', async () => {
    const resource = service.resource('task');
    const promise = firstValueFrom(resource.request('/1', 'delete', null, () => of('handled')));

    http.expectOne((request) => request.url.includes('/task/1')).flush('x', {
      status: 500,
      statusText: 'Server Error',
    });

    await expect(promise).resolves.toBe('handled');
  });

  it('reuses resource state and supports object paths without a suffix', () => {
    const first = service.resource({ resourcePath: 'task' });
    const second = service.resource({ resourcePath: 'task' });

    expect(first.isLoading).toBe(second.isLoading);
  });

  it('handles empty and non-path nested request suffixes', async () => {
    const resource = service.resource({ resourcePath: 'task', suffix: '/time-log' });
    const emptySuffix = firstValueFrom(resource.request());
    http.expectOne((request) => request.url.includes('/task/time-log')).flush({ ok: true });
    await expect(emptySuffix).resolves.toEqual({ ok: true });

    const plainSuffix = firstValueFrom(resource.request('task-1'));
    http.expectOne((request) => request.url.includes('/tasktask-1/time-log')).flush({ ok: true });
    await expect(plainSuffix).resolves.toEqual({ ok: true });
  });

  it('maps null list data and object-shaped not-found errors to empty lists', async () => {
    const resource = service.resource('task');
    const nullData = firstValueFrom(resource.listRequest('/null'));
    http.expectOne((request) => request.url.includes('/task/null')).flush({ data: null });
    await expect(nullData).resolves.toEqual([]);

    const objectNotFound = firstValueFrom(resource.listRequest('/object-error', 'get', null, () => throwError(() => ({ status: 404 }))));
    http.expectOne((request) => request.url.includes('/task/object-error')).flush('x', {
      status: 500,
      statusText: 'Server Error',
    });
    await expect(objectNotFound).resolves.toEqual([]);
  });

});
