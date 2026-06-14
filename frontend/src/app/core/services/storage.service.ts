import { inject, Injectable, Injector, Signal, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

import { UseStore } from 'idb-keyval';
import { catchError, filter, from, map, Observable, of, switchMap, take, tap, throwError } from 'rxjs';

import { DbFailInterface } from '@core/interfaces/db-fail.interface';
import { LoaderStateService } from '@core/services/loader-state.service';
import { storageIdbGateway } from '@core/services/storage-idb.gateway';
import { KeyValueEntry } from '@core/types/key-value-entry.type';

import { LoadableService } from '@shared/interfaces/loadable-service.interface';

@Injectable({
  providedIn: 'root',
})
export class StorageService implements LoadableService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  public readonly isLoading$: Observable<boolean>;
  public readonly isDbFailed$: Observable<DbFailInterface | undefined>;

  protected stores: Map<string, UseStore> = new Map<string, UseStore>([]);

  private readonly injector: Injector = inject(Injector);
  private readonly isLoadingSignal = signal<boolean>(false);
  private readonly isDbFailedSignal = signal<DbFailInterface | undefined>(undefined);

  public get isLoading(): Signal<boolean> {
    return this.isLoadingSignal.asReadonly();
  }

  public get isDbFailed(): Signal<DbFailInterface | undefined> {
    return this.isDbFailedSignal.asReadonly();
  }

  constructor() {
    this.isLoading$ = toObservable(this.isLoading, { injector: this.injector });
    this.isDbFailed$ = toObservable(this.isDbFailed, { injector: this.injector });
  }

  private static createStore(
    name: string,
  ): UseStore {
    const dbName: string = `${ name }-db`;
    const storeName: string = `${ name }-store`;

    return storageIdbGateway.createStore(
      dbName,
      storeName,
    );
  }

  public init(): void {
    this.loaderStateService.addLoader(
      this.isLoading$,
      this.constructor.name,
    );
    this.createStores();
  }

  public list(
    customStoreName?: string,
  ): Observable<KeyValueEntry[]> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }
    }

    const request: (csn?: string) => Observable<KeyValueEntry[]> = (
      csn?: string,
    ): Observable<KeyValueEntry[]> => from(
      storageIdbGateway.entries(
        this.getUseStore(csn),
      ),
    );

    return this.waitForTurn()
      .pipe(
        switchMap(() => request(customStoreName)),
        catchError((error) => this.reportError(
          error,
          request,
          {
            customStoreName,
          },
        )),
        tap(() => this.isLoadingSignal.set(false)),
      );
  }

  public read<TValue = unknown>(
    key: IDBValidKey,
    customStoreName?: string,
  ): Observable<TValue> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }
    }

    const request: (k: IDBValidKey, csn?: string) => Observable<TValue> = (
      k: IDBValidKey,
      csn?: string,
    ): Observable<TValue> => from(
      storageIdbGateway.get(
        k,
        this.getUseStore(csn),
      ),
    ) as Observable<TValue>;

    return this.waitForTurn()
      .pipe(
        switchMap(() => request(
          key,
          customStoreName,
        )),
        catchError((error) => this.reportError(
          error,
          request,
          {
            customStoreName,
            key,
          },
        )),
        tap(() => this.isLoadingSignal.set(false)),
      );
  }

  public create(
    key: IDBValidKey,
    value: unknown,
    customStoreName?: string,
  ): Observable<void> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }
    }

    const request: (k: IDBValidKey, v: unknown, csn?: string) => Observable<void> = (
      k: IDBValidKey,
      v: unknown,
      csn?: string,
    ) => from(
      storageIdbGateway.set(
        k,
        v,
        this.getUseStore(csn),
      ),
    );

    return this.waitForTurn()
      .pipe(
        switchMap(() => request(
          key,
          value,
          customStoreName,
        )),
        catchError((error) => this.reportError(
          error,
          request,
          {
            customStoreName,
            key,
            value,
          },
        )),
        tap(() => this.isLoadingSignal.set(false)),
      );
  }

  public update(
    key: IDBValidKey,
    value: unknown,
    customStoreName?: string,
  ): Observable<void> {
    return this.create(
      key,
      value,
      customStoreName,
    );
  }

  public massUpdate(
    data: {
      key: IDBValidKey;
      value: unknown
    }[],
    customStoreName?: string,
  ): Observable<void> {
    if (customStoreName) {
      if (!this.stores.has(customStoreName)) {
        throw new Error('Invalid store!');
      }
    }

    const dataEntries: KeyValueEntry[] = data.map(
      (dataRow: {
        key: IDBValidKey;
        value: unknown
      }) => [
        dataRow.key,
        dataRow.value,
      ]);

    const request: (d: KeyValueEntry[], csn?: string) => Observable<void> = (
      d: KeyValueEntry[],
      csn?: string,
    ) => from(
      storageIdbGateway.setMany(
        d,
        this.getUseStore(csn),
      ),
    );

    return this.waitForTurn()
      .pipe(
        switchMap(() => request(
          dataEntries,
          customStoreName,
        )),
        catchError((error) => this.reportError(
          error,
          request,
          {
            customStoreName,
            dataEntries,
          },
        )),
        tap(() => this.isLoadingSignal.set(false)),
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

    const request: (k: IDBValidKey, csn?: string) => Observable<void> = (
      k: IDBValidKey,
      csn?: string,
    ) => from(
      storageIdbGateway.del(
        k,
        this.getUseStore(csn),
      ),
    );

    return this.waitForTurn()
      .pipe(
        switchMap(() => request(
          key,
          customStoreName,
        )),
        catchError((error) => this.reportError(
          error,
          request,
          {
            customStoreName,
            key,
          },
        )),
        tap(() => this.isLoadingSignal.set(false)),
      );
  }

  public recreateStore(
    data: {
      key: IDBValidKey;
      value: unknown;
    }[],
    customStoreName: string,
  ): Observable<boolean> {
    if (!this.stores.has(customStoreName)) {
      throw new Error('Invalid store!');
    }

    StorageService.createStore(customStoreName);

    return this.massUpdate(
      data,
      customStoreName,
    )
      .pipe(
        take(1),
        catchError(() => {
          return of(false);
        }),
        map(() => true),
      );
  }

  public listStores(): string[] {
    return Array.from(this.stores.keys());
  }

  private reportError<TArgs extends unknown[]>(
    error: unknown,
    request: (...rArgs: TArgs) => Observable<unknown>,
    args: {
      customStoreName?: string;
      key?: IDBValidKey;
      value?: unknown;
      dataEntries?: KeyValueEntry[]
    },
  ): Observable<never> {
    void request;

    this.isDbFailedSignal.set({
      customStoreName: args.customStoreName,
      data: {
        key: args.key,
        value: args.value,
        dataEntries: args.dataEntries,
      },
    });

    this.isLoadingSignal.set(false);

    return throwError(() => error);
  }

  private getUseStore(
    customStoreName?: string,
  ): UseStore | undefined {
    return customStoreName ?
      (this.stores.get(customStoreName) as UseStore) :
      undefined;
  }

  private createStores(): void {
    const stores: string[] = [
      'task',
      'settings',
    ];

    stores.forEach(
      (storeName: string) => this.stores.set(
        storeName,
        StorageService.createStore(storeName),
      ),
    );
  }

  private waitForTurn(): Observable<boolean> {
    if (!this.isLoadingSignal()) {
      this.isLoadingSignal.set(true);
      return of(true);
    }

    return this.isLoading$
      .pipe(
        filter((isLoading: boolean) => !isLoading),
        take(1),
        tap(() => this.isLoadingSignal.set(true)),
      );
  }
}
