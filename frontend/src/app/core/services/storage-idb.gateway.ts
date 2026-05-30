import { StorageIdbGateway } from '@core/interfaces/storage-idb-gateway.interface';
import { createStore, del, entries, get, set, setMany, UseStore } from 'idb-keyval';

export const storageIdbGateway: StorageIdbGateway = {
  createStore: (dbName: string, storeName: string): UseStore => createStore(dbName, storeName),
  entries: <TValue = unknown>(store?: UseStore): Promise<[IDBValidKey, TValue][]> => entries(store) as Promise<[IDBValidKey, TValue][]>,
  get: <TValue = unknown>(key: IDBValidKey, store?: UseStore): Promise<TValue> => get(key, store) as Promise<TValue>,
  set: <TValue = unknown>(key: IDBValidKey, value: TValue, store?: UseStore): Promise<void> => set(key, value, store),
  setMany: <TValue = unknown>(data: [IDBValidKey, TValue][], store?: UseStore): Promise<void> => setMany(data, store),
  del: (key: IDBValidKey, store?: UseStore): Promise<void> => del(key, store),
};
