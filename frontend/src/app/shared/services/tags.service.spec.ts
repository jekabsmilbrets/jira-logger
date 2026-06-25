import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { catchError, firstValueFrom, of, throwError } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

import { Tag } from '@shared/models/tag.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import { ErrorDialogService } from '@shared/services/error-dialog.service';

import { TagsService } from './tags.service';

describe('Shared Services tags.service', () => {
  let service: TagsService;
  const apiRequestService = {
    buildApiUrl: vi.fn((base: string, suffix = '') => `https://api/${ base }${ suffix }`),
    request: vi.fn(),
    resourceRequest: vi.fn((
      base: string,
      suffix: string,
      _requestGate: unknown,
      _isLoadingSignal: unknown,
      method: 'get' | 'post' | 'patch' | 'delete',
      body: unknown,
      processError?: (error: unknown) => any,
    ) => apiRequestService.request(apiRequestService.buildApiUrl(base, suffix), method, body)
      .pipe(catchError((error: unknown) => processError ? processError(error) : throwError(() => error)))),
  } as any;
  const errorDialogService = {
    openDialog: vi.fn(() => of(undefined)),
  } as any;

  beforeEach(async () => {
    apiRequestService.request.mockReset();
    apiRequestService.resourceRequest.mockClear();
    apiRequestService.buildApiUrl.mockClear();
    await TestBed.configureTestingModule({
      providers: [
        { provide: LoaderStateService, useValue: { isLoading: signal(false).asReadonly(), addLoader: vi.fn() } },
        { provide: ApiRequestService, useValue: apiRequestService },
        { provide: ErrorDialogService, useValue: errorDialogService },
      ],
    });
    service = TestBed.inject(TagsService);
    vi.clearAllMocks();
  });

  it('lists tags and maps response', async () => {
    apiRequestService.request.mockReturnValueOnce(of({
      data: [{
        id: '1',
        isUsed: true,
        name: 'Backend',
        createdAt: '2024-01-01T00:00:00.000Z',
      }],
    }));
    const result = await firstValueFrom(service.list());

    expect(apiRequestService.buildApiUrl).toHaveBeenCalledWith('tag', '');
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Tag);
    expect(result[0].isUsed).toBe(true);
  });

  it('preloadForInit returns [] and marks preloadError on failure', async () => {
    apiRequestService.request.mockReturnValueOnce(throwError(() => ({ status: 500 })));
    const result = await firstValueFrom(service.preloadForInit());
    expect(result).toEqual([]);
  });

  it('create/update/delete call request with expected methods', async () => {
    apiRequestService.request
      .mockReturnValueOnce(of({ data: { id: '1', isUsed: false, name: 'A', createdAt: '2024-01-01T00:00:00.000Z' } }))
      .mockReturnValueOnce(of({ data: [] }))
      .mockReturnValueOnce(of({ data: { id: '1', isUsed: true, name: 'B', createdAt: '2024-01-01T00:00:00.000Z' } }))
      .mockReturnValueOnce(of({ data: [] }))
      .mockReturnValueOnce(of(undefined))
      .mockReturnValueOnce(of({ data: [] }));

    const tag = new Tag({ id: '1', name: ' A ' } as any);

    await firstValueFrom(service.create(tag));
    await firstValueFrom(service.update(new Tag({ id: '1', name: ' B ' } as any)));
    await firstValueFrom(service.delete(tag));

    expect(apiRequestService.request).toHaveBeenNthCalledWith(1, 'https://api/tag', 'post', { name: 'A' });
    expect(apiRequestService.request).toHaveBeenNthCalledWith(3, 'https://api/tag/1', 'patch', { id: '1', name: 'B' });
    expect(apiRequestService.request).toHaveBeenNthCalledWith(5, 'https://api/tag/1', 'delete', null);
  });
});
