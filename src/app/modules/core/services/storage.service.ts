import { Injectable } from '@angular/core';

// eslint-disable-next-line import/named
import { createStore, del, entries, get, set, setMany, UseStore }                                           from 'idb-keyval';
import { from, Observable, BehaviorSubject, filter, take, switchMap, tap, catchError, throwError, of, map } from 'rxjs';

import { DbFailInterface } from '@core/interfaces/db-fail.interface';

@Injectable()
export class StorageService {
  public isLoading$: Observable<boolean>;
  public isDbFailed$: Observable<DbFailInterface | undefined>;

  protected stores: Map<string, UseStore> = new Map<string, UseStore>([]);

  private isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private isDbFailedSubject: BehaviorSubject<DbFailInterface | undefined> = new BehaviorSubject<DbFailInterface | undefined>(
    undefined);

  constructor() {
    this.createStores();
    this.isLoading$ = this.isLoadingSubject.asObservable();
    this.isDbFailed$ = this.isDbFailedSubject.asObservable();
  }

  private static createStore(name: string): UseStore {
    const dbName = `${name}-db`;
    const storeName = `${name}-store`;

    return createStore(dbName, storeName);
  }

  public list(
    customStoreName?: string,
  ): Observable<any> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }
    }

    const request = (csn?: string) => from(
      entries(
        this.getUseStore(csn),
      ),
    );

    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => request(customStoreName),
                 ),
                 catchError(
                   (error) => this.reportError(
                     error,
                     request,
                     {
                       customStoreName,
                     },
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

    const request = (
      k: IDBValidKey,
      csn?: string,
    ) => from(
      get(
        k,
        this.getUseStore(csn),
      ),
    );

    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => request(key, customStoreName),
                 ),
                 catchError(
                   (error) => this.reportError(
                     error,
                     request,
                     {
                       customStoreName,
                       key,
                     },
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

    const request = (
      k: IDBValidKey,
      v: any,
      csn?: string,
    ) => from(
      set(
        k,
        v,
        this.getUseStore(csn),
      ),
    );

    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => request(key, value, customStoreName),
                 ),
                 catchError(
                   (error) => this.reportError(
                     error,
                     request,
                     {
                       customStoreName,
                       key,
                       value,
                     },
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
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }
    }

    const dataEntries: [IDBValidKey, any][] = data.map(
      (dataRow: { key: IDBValidKey; value: any }) => [
        dataRow.key,
        dataRow.value,
      ],
    );

    const request = (
      d: [IDBValidKey, any][],
      csn?: string,
    ) => from(
      setMany(
        d,
        this.getUseStore(csn),
      ),
    );

    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => request(dataEntries, customStoreName),
                 ),
                 catchError(
                   (error) => this.reportError(
                     error,
                     request,
                     {
                       customStoreName,
                       dataEntries,
                     },
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

    const request = (
      k: IDBValidKey,
      csn?: string,
    ) => from(
      del(
        k,
        this.getUseStore(csn),
      ),
    );

    return this.waitForTurn()
               .pipe(
                 switchMap(
                   () => request(key, customStoreName),
                 ),
                 catchError(
                   (error) => this.reportError(
                     error,
                     request,
                     {
                       customStoreName,
                       key,
                     },
                   ),
                 ),
                 tap(() => this.isLoadingSubject.next(false)),
               );
  }

  public recreateStore(
    data: { key: IDBValidKey; value: any }[],
    customStoreName: string,
  ): Observable<boolean> {
    if (!this.stores.has(customStoreName)) {
      throw new Error('Invalid store!');
    }

    StorageService.createStore(customStoreName);

    return this.massUpdate(data, customStoreName)
               .pipe(
                 take(1),
                 catchError((error) => {
                   console.error('Error @ recreateStore ', {error});
                   return of(false);
                 }),
                 map(() => true),
               );
  }

  public listStores(): string[] {
    return Array.from(this.stores.keys());
  }

  private reportError(
    error: any,
    request: (...rArgs: any) => Observable<any>,
    args: { customStoreName?: string; key?: IDBValidKey; value?: any; dataEntries?: [IDBValidKey, any][] },
  ): Observable<never> {
    console.error(
      {
        error,
        request,
        args,
      },
    );

    this.isDbFailedSubject.next(
      {
        customStoreName: args.customStoreName,
        data: {
          key: args.key,
          value: args.value,
          dataEntries: args.dataEntries,
        },
      },
    );

    return throwError(error);
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
        StorageService.createStore(storeName),
      ),
    );
  }
}
