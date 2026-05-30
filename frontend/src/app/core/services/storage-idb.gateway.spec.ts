import 'fake-indexeddb/auto';

import { storageIdbGateway } from './storage-idb.gateway';

describe('Core Services storage-idb.gateway', () => {
  it('creates a store handle', () => {
    const store = storageIdbGateway.createStore('unit-test-db', 'unit-test-store');
    expect(store).toBeDefined();
  });

  it('persists and reads values via idb-keyval gateway', async () => {
    const store = storageIdbGateway.createStore('unit-test-db-2', 'unit-test-store-2');

    await expect(storageIdbGateway.set('k', 'v', store)).resolves.toBeUndefined();
    await expect(storageIdbGateway.get('k', store)).resolves.toBe('v');

    await expect(storageIdbGateway.setMany([['a', 1], ['b', 2]], store)).resolves.toBeUndefined();
    await expect(storageIdbGateway.entries(store)).resolves.toEqual(
      expect.arrayContaining([
        ['k', 'v'],
        ['a', 1],
        ['b', 2],
      ]),
    );

    await expect(storageIdbGateway.del('k', store)).resolves.toBeUndefined();
    await expect(storageIdbGateway.get('k', store)).resolves.toBeUndefined();
  });
});
