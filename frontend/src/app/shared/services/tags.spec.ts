import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom, of, throwError } from 'rxjs';

import { LoaderState } from '@core/services/loader-state';

import { Tag } from '@shared/models/tag.model';
import { ApiRequest } from '@shared/services/api-request';
import { ErrorDialog } from '@shared/services/error-dialog';
import { createResourceRequestHandleMock } from '@shared/testing/resource-request-handle.mock';

import { Tags } from './tags';

describe('Shared Services tags', () => {
  let service: Tags;
  const apiRequestService = createResourceRequestHandleMock();
  const errorDialogService = {
    openDialog: vi.fn(() => of(undefined)),
  } as any;

  beforeEach(async () => {
    apiRequestService.request.mockReset();
    apiRequestService.resource.mockClear();
    apiRequestService.isLoadingSignal.set(false);
    await TestBed.configureTestingModule({
      providers: [
        { provide: LoaderState, useValue: { isLoading: signal(false).asReadonly(), addLoader: vi.fn() } },
        { provide: ApiRequest, useValue: apiRequestService },
        { provide: ErrorDialog, useValue: errorDialogService },
      ],
    });
    service = TestBed.inject(Tags);
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

    expect(apiRequestService.request).toHaveBeenCalledWith('https://api/tag', 'get', null);
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

  it('initializes the loader and clears preload errors after a successful list', async () => {
    apiRequestService.request.mockReturnValueOnce(of({ data: [] }));

    service.init();

    expect(service.loaderStateService.addLoader).toHaveBeenCalledWith(service.isLoading, 'Tags');
    expect(service.preloadError()).toBe(false);
  });

  it('skips reloads after mutations when requested', async () => {
    apiRequestService.request
      .mockReturnValueOnce(of({ data: { id: '1', isUsed: false, name: '', createdAt: '2024-01-01T00:00:00.000Z' } }))
      .mockReturnValueOnce(of({ data: { id: '1', isUsed: false, name: '', createdAt: '2024-01-01T00:00:00.000Z' } }))
      .mockReturnValueOnce(of(undefined));

    const tag = new Tag({ id: '1', name: '' } as any);

    await firstValueFrom(service.create(tag, true));
    await firstValueFrom(service.update(tag, true));
    await firstValueFrom(service.delete(tag, true));

    expect(apiRequestService.request).toHaveBeenCalledTimes(3);
    expect(apiRequestService.request).toHaveBeenNthCalledWith(1, 'https://api/tag', 'post', { name: '' });
  });

  it('routes mutation failures through the error dialog', async () => {
    const tag = new Tag({ id: '1', name: 'Tag' } as any);
    apiRequestService.request.mockReturnValueOnce(throwError(() => new Error('create failed')));
    await expect(firstValueFrom(service.create(tag))).rejects.toThrow('create failed');

    apiRequestService.request.mockReturnValueOnce(throwError(() => new Error('update failed')));
    await expect(firstValueFrom(service.update(tag))).rejects.toThrow('update failed');

    apiRequestService.request.mockReturnValueOnce(throwError(() => new Error('delete failed')));
    await expect(firstValueFrom(service.delete(tag))).rejects.toThrow('delete failed');

    expect(errorDialogService.openDialog).toHaveBeenCalledTimes(3);
  });
});
