import { TestBed } from '@angular/core/testing';

import { LoaderStateService } from '@core/services/loader-state.service';
import { storageIdbGateway } from '@core/services/storage-idb.gateway';
import { firstValueFrom } from 'rxjs';

import { StorageService } from './storage.service';

describe('Core Services storage.service', () => {
  let service: StorageService;
  let createStoreSpy: ReturnType<typeof vi.spyOn>;
  let entriesSpy: ReturnType<typeof vi.spyOn>;
  let getSpy: ReturnType<typeof vi.spyOn>;
  let setSpy: ReturnType<typeof vi.spyOn>;
  let setManySpy: ReturnType<typeof vi.spyOn>;
  let delSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
    createStoreSpy = vi.spyOn(storageIdbGateway, 'createStore').mockImplementation((db: string, store: string) => ({ db, store } as any));
    entriesSpy = vi.spyOn(storageIdbGateway, 'entries').mockResolvedValue([]);
    getSpy = vi.spyOn(storageIdbGateway, 'get').mockResolvedValue(undefined);
    setSpy = vi.spyOn(storageIdbGateway, 'set').mockResolvedValue(undefined);
    setManySpy = vi.spyOn(storageIdbGateway, 'setMany').mockResolvedValue(undefined);
    delSpy = vi.spyOn(storageIdbGateway, 'del').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes stores and registers loader', () => {
    const loader = TestBed.inject(LoaderStateService);
    const spy = vi.spyOn(loader, 'addLoader');

    service.init();

    expect(spy).toHaveBeenCalledWith(service.isLoading$, expect.stringContaining('StorageService'));
    expect(createStoreSpy).toHaveBeenCalledWith('task-db', 'task-store');
    expect(createStoreSpy).toHaveBeenCalledWith('settings-db', 'settings-store');
    expect(service.listStores()).toEqual(['task', 'settings']);
  });

  it('throws for invalid custom store', () => {
    expect(() => service.list('missing')).toThrow('Invalid store!');
    expect(() => service.read('k', 'missing')).toThrow('Invalid store!');
    expect(() => service.create('k', 1, 'missing')).toThrow('Invalid store!');
    expect(() => service.massUpdate([{ key: 'k', value: 1 }], 'missing')).toThrow('Invalid store!');
    expect(() => service.delete('k', 'missing')).toThrow('Invalid store!');
    expect(() => service.recreateStore([], 'missing')).toThrow('Invalid store!');
  });

  it('lists entries from default store', async () => {
    entriesSpy.mockResolvedValue([['k', 'v']] as any);

    const result = await firstValueFrom(service.list());

    expect(entriesSpy).toHaveBeenCalledWith(undefined);
    expect(result).toEqual([['k', 'v']]);
  });

  it('reads value', async () => {
    service.init();
    getSpy.mockResolvedValue('v');

    const result = await firstValueFrom(service.read('k', 'task'));

    expect(getSpy).toHaveBeenCalledWith('k', expect.any(Object));
    expect(result).toBe('v');
  });

  it('reads value from default store when custom store is not provided', async () => {
    getSpy.mockResolvedValue('v');

    const result = await firstValueFrom(service.read('k'));

    expect(getSpy).toHaveBeenCalledWith('k', undefined);
    expect(result).toBe('v');
  });

  it('creates and updates value', async () => {
    service.init();
    setSpy.mockResolvedValue(undefined);

    await expect(firstValueFrom(service.create('k', 'v', 'task'))).resolves.toBeUndefined();
    await expect(firstValueFrom(service.update('k', 'v2', 'task'))).resolves.toBeUndefined();
    expect(setSpy).toHaveBeenCalledTimes(2);
  });

  it('creates value in default store when custom store is not provided', async () => {
    setSpy.mockResolvedValue(undefined);

    await expect(firstValueFrom(service.create('k', 'v'))).resolves.toBeUndefined();
    expect(setSpy).toHaveBeenCalledWith('k', 'v', undefined);
  });

  it('mass updates and deletes', async () => {
    service.init();
    setManySpy.mockResolvedValue(undefined);
    delSpy.mockResolvedValue(undefined);

    await expect(firstValueFrom(service.massUpdate([{ key: 'k', value: 1 }], 'task'))).resolves.toBeUndefined();
    await expect(firstValueFrom(service.delete('k', 'task'))).resolves.toBeUndefined();

    expect(setManySpy).toHaveBeenCalledWith([['k', 1]], expect.any(Object));
    expect(delSpy).toHaveBeenCalledWith('k', expect.any(Object));
  });

  it('mass updates and deletes in default store when custom store is not provided', async () => {
    setManySpy.mockResolvedValue(undefined);
    delSpy.mockResolvedValue(undefined);

    await expect(firstValueFrom(service.massUpdate([{ key: 'k', value: 1 }]))).resolves.toBeUndefined();
    await expect(firstValueFrom(service.delete('k'))).resolves.toBeUndefined();

    expect(setManySpy).toHaveBeenCalledWith([['k', 1]], undefined);
    expect(delSpy).toHaveBeenCalledWith('k', undefined);
  });

  it('emits db failure details on request error', async () => {
    service.init();
    entriesSpy.mockRejectedValue(new Error('boom'));

    const promise = firstValueFrom(service.list('task'));

    await expect(promise).rejects.toThrow('boom');
    await expect(firstValueFrom(service.isDbFailed$)).resolves.toEqual({
      customStoreName: 'task',
      data: {
        key: undefined,
        value: undefined,
        dataEntries: undefined,
      },
    });
  });

  it('reports db failure for read request error', async () => {
    service.init();

    getSpy.mockRejectedValueOnce(new Error('read-fail'));
    await expect(firstValueFrom(service.read('k', 'task'))).rejects.toThrow('read-fail');
  });

  it('reports db failure for create request error', async () => {
    service.init();

    setSpy.mockRejectedValueOnce(new Error('create-fail'));
    await expect(firstValueFrom(service.create('k', 'v', 'task'))).rejects.toThrow('create-fail');
  });

  it('reports db failure for delete request error', async () => {
    service.init();

    delSpy.mockRejectedValueOnce(new Error('delete-fail'));
    await expect(firstValueFrom(service.delete('k', 'task'))).rejects.toThrow('delete-fail');
  });

  it('recreates store and returns true on success', async () => {
    service.init();
    setManySpy.mockResolvedValue(undefined);

    await expect(firstValueFrom(service.recreateStore([{ key: 'k', value: 1 }], 'task'))).resolves.toBe(true);
    expect(createStoreSpy).toHaveBeenCalledWith('task-db', 'task-store');
  });

  it('recreateStore still resolves true when massUpdate fails', async () => {
    service.init();
    setManySpy.mockRejectedValue(new Error('fail'));

    await expect(firstValueFrom(service.recreateStore([{ key: 'k', value: 1 }], 'task'))).resolves.toBe(true);
  });
});
