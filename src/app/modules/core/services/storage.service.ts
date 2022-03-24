import { Injectable }                                                      from '@angular/core';
// eslint-disable-next-line import/named
import { createStore, del, entries, get, set, setMany, UseStore }          from 'idb-keyval';
import { from, Observable, BehaviorSubject, filter, take, switchMap, tap } from 'rxjs';

@Injectable()
export class StorageService {
  public isLoading$: Observable<boolean>;

  protected stores: Map<string, UseStore> = new Map<string, UseStore>([]);

  private isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor() {
    this.createStores();
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  public list(
    customStoreName?: string,
  ): Observable<any> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }
    }

    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => from(
                     entries(
                       this.getUseStore(customStoreName),
                     ),
                   ),
                 ),
                 tap(() => this.isLoadingSubject.next(false)),
               );
  }

  public read(
    key: IDBValidKey,
    customStoreName?: string,
  ): Observable<any> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }
    }

    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => from(
                     get(
                       key,
                       this.getUseStore(customStoreName),
                     ),
                   ),
                 ),
                 tap(() => this.isLoadingSubject.next(false)),
               );
  }

  public create(
    key: IDBValidKey,
    value: any,
    customStoreName?: string,
  ): Observable<void> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }
    }

    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => from(
                     set(
                       key,
                       value,
                       this.getUseStore(customStoreName),
                     ),
                   ),
                 ),
                 tap(() => this.isLoadingSubject.next(false)),
               );
  }

  public update(
    key: IDBValidKey,
    value: any,
    customStoreName?: string,
  ): Observable<void> {
    return this.create(key, value, customStoreName);
  }

  public massUpdate(
    data: { key: IDBValidKey; value: any }[],
    customStoreName?: string,
  ): Observable<void> {
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
    }

    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => from(
                     setMany(
                       dataEntries,
                       this.getUseStore(customStoreName),
                     ),
                   ),
                 ),
                 tap(() => this.isLoadingSubject.next(false)),
               );
  }

  public delete(
    key: IDBValidKey,
    customStoreName?: string,
  ): Observable<void> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }
    }

    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => from(
                     del(
                       key,
                       this.getUseStore(customStoreName),
                     ),
                   ),
                 ),
                 tap(() => this.isLoadingSubject.next(false)),
               );
  }

  public listStores(): string[] {
    return Array.from(this.stores.keys());
  }

  private getUseStore(customStoreName?: string): UseStore | undefined {
    return customStoreName ? (this.stores.get(customStoreName) as UseStore) : undefined;
  }

  private waitForTurn(): Observable<boolean> {
    return this.isLoading$
               .pipe(
                 filter(isLoading => !isLoading),
                 take(1),
                 tap(() => this.isLoadingSubject.next(true)),
               );
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
