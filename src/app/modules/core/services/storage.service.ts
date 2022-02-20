import { Injectable } from '@angular/core';
// eslint-disable-next-line import/named
import { createStore, get, set, update, del, entries, UseStore } from 'idb-keyval';
import { Observable, from } from 'rxjs';

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
      update(
        key,
        value,
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
