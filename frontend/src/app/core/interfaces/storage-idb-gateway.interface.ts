import { UseStore } from 'idb-keyval';

export interface StorageIdbGateway {
  createStore: (dbName: string, storeName: string) => UseStore;
  entries: <TValue = unknown>(store?: UseStore) => Promise<[IDBValidKey, TValue][]>;
  get: <TValue = unknown>(key: IDBValidKey, store?: UseStore) => Promise<TValue>;
  set: <TValue = unknown>(key: IDBValidKey, value: TValue, store?: UseStore) => Promise<void>;
  setMany: <TValue = unknown>(data: [IDBValidKey, TValue][], store?: UseStore) => Promise<void>;
  del: (key: IDBValidKey, store?: UseStore) => Promise<void>;
}
