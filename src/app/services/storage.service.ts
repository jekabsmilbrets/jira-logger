import { Injectable } from '@angular/core';
import { createStore, UseStore, get, set, update, del, getMany, keys, entries } from 'idb-keyval';
import { Observable, throwError, from } from 'rxjs';

@Injectable()
export class StorageService {

  protected stores: Map<string, UseStore> = new Map<string, UseStore>([]);

  constructor() {
    this.createStores();
  }

  public read(key: IDBValidKey, customStoreName?: string): Observable<any> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        return throwError(() => 'Invalid store!');
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

  public listAll(customStoreName?: string): Observable<any> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        return throwError(() => 'Invalid store!');
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

  public create(key: IDBValidKey, value: any, customStoreName?: string): Observable<void> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        return throwError(() => 'Invalid store!');
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
        return throwError(() => 'Invalid store!');
      }

      return from(
        update(
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

  public delete(key: IDBValidKey, value: any, customStoreName?: string): Observable<void> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        return throwError(() => 'Invalid store!');
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

  private createStores(): void {
    const stores = [
      'task',
    ];

    stores.forEach(
      (storeName: string) => this.stores.set(
        storeName,
        createStore(storeName + '-db', storeName + 'store'),
      ),
    );
  }
}
