import { Injectable }                                              from '@angular/core';
// eslint-disable-next-line import/named
import { createStore, del, entries, get, set, setMany, UseStore } from 'idb-keyval';
import { from, Observable }                                       from 'rxjs';

@Injectable()
export class StorageService {

  protected stores: Map<string, UseStore> = new Map<string, UseStore>([]);

  constructor() {
    this.createStores();
  }

  public list(customStoreName?: string): Observable<any> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }

      return from(
        entries(
          this.stores.get(customStoreName) as UseStore,
        ),
      );
    }

    return from(
      entries(),
    );
  }

  public read(key: IDBValidKey, customStoreName?: string): Observable<any> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }

      return from(
        get(
          key,
          this.stores.get(customStoreName) as UseStore,
        ),
      );
    }

    return from(
      get(key),
    );
  }

  public create(key: IDBValidKey, value: any, customStoreName?: string): Observable<void> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }

      return from(
        set(
          key,
          value,
          this.stores.get(customStoreName) as UseStore,
        ),
      );
    }

    return from(
      set(
        key,
        value,
      ),
    );
  }

  public update(key: IDBValidKey, value: any, customStoreName?: string): Observable<void> {
    return this.create(key, value, customStoreName);
  }

  public massUpdate(data: { key: IDBValidKey; value: any }[], customStoreName?: string): Observable<void> {
    const dataEntries: [IDBValidKey, any][] = data.map(
      (dataRow: { key: IDBValidKey; value: any }) => [
        dataRow.key,
        dataRow.value,
      ],
    );

    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }

      return from(
        setMany(
          dataEntries,
          this.stores.get(customStoreName) as UseStore,
        ),
      );
    }


    return from(
      setMany(
        dataEntries,
      ),
    );
  }

  public delete(key: IDBValidKey, customStoreName?: string): Observable<void> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }

      return from(
        del(
          key,
          this.stores.get(customStoreName) as UseStore,
        ),
      );
    }

    return from(
      del(
        key,
      ),
    );
  }

  public listStores(): string[] {
    return Array.from(this.stores.keys());
  }

  private createStores(): void {
    const stores = [
      'task',
    ];

    stores.forEach(
      (storeName: string) => this.stores.set(
        storeName,
        createStore(storeName + '-db', storeName + '-store'),
      ),
    );
  }
}
