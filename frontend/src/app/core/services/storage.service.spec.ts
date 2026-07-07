import { TestBed } from '@angular/core/testing';

import { IDBFactory as FakeIDBFactory } from 'fake-indexeddb';
import { firstValueFrom } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

import { StorageService } from './storage.service';

import 'fake-indexeddb/auto';

const resetIndexedDb = (): void => {
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: new FakeIDBFactory(),
  });
};

describe('Core Services storage.service', () => {
  let service: StorageService;

  beforeEach(async () => {
    resetIndexedDb();
    await TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('initializes stores and registers loader', () => {
    const loader = TestBed.inject(LoaderStateService);
    const spy = vi.spyOn(loader, 'addLoader');

    service.init();

    expect(spy).toHaveBeenCalledWith(service.isLoading, expect.stringContaining('StorageService'));
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
    await firstValueFrom(service.create('k', 'v'));

    const result = await firstValueFrom(service.list());

    expect(result).toEqual([['k', 'v']]);
  });

  it('reads value', async () => {
    service.init();
    await firstValueFrom(service.create('k', 'v', 'task'));

    const result = await firstValueFrom(service.read('k', 'task'));

    expect(result).toBe('v');
  });

  it('reads value from default store when custom store is not provided', async () => {
    await firstValueFrom(service.create('k', 'v'));

    const result = await firstValueFrom(service.read('k'));

    expect(result).toBe('v');
  });

  it('creates and updates value', async () => {
    service.init();

    await expect(firstValueFrom(service.create('k', 'v', 'task'))).resolves.toBeUndefined();
    await expect(firstValueFrom(service.update('k', 'v2', 'task'))).resolves.toBeUndefined();
    await expect(firstValueFrom(service.read('k', 'task'))).resolves.toBe('v2');
  });

  it('creates value in default store when custom store is not provided', async () => {
    await expect(firstValueFrom(service.create('k', 'v'))).resolves.toBeUndefined();
    await expect(firstValueFrom(service.read('k'))).resolves.toBe('v');
  });

  it('mass updates and deletes', async () => {
    service.init();

    await expect(firstValueFrom(service.massUpdate([{ key: 'k', value: 1 }], 'task'))).resolves.toBeUndefined();
    await expect(firstValueFrom(service.read('k', 'task'))).resolves.toBe(1);
    await expect(firstValueFrom(service.delete('k', 'task'))).resolves.toBeUndefined();
    await expect(firstValueFrom(service.read('k', 'task'))).resolves.toBeUndefined();
  });

  it('mass updates and deletes in default store when custom store is not provided', async () => {
    await expect(firstValueFrom(service.massUpdate([{ key: 'k', value: 1 }]))).resolves.toBeUndefined();
    await expect(firstValueFrom(service.read('k'))).resolves.toBe(1);
    await expect(firstValueFrom(service.delete('k'))).resolves.toBeUndefined();
    await expect(firstValueFrom(service.read('k'))).resolves.toBeUndefined();
  });

  it('recreates store and returns true on success', async () => {
    service.init();

    await expect(firstValueFrom(service.recreateStore([{ key: 'k', value: 1 }], 'task'))).resolves.toBe(true);
    await expect(firstValueFrom(service.read('k', 'task'))).resolves.toBe(1);
  });
});
