import { inject, Service, type Signal, signal, type WritableSignal } from '@angular/core';

import { createStore, del, entries, get, set, setMany, type UseStore } from 'idb-keyval';
import { catchError, finalize, from, map, Observable, of, switchMap, take, throwError } from 'rxjs';

import type { DbFail } from '@core/interfaces/db-fail.interface';
import { LoaderState } from '@core/services/loader-state';
import type { KeyValueEntry } from '@core/types/key-value-entry.type';
import { RequestGate } from '@core/utilities/request-gate.utility';
import { waitForTurn } from '@core/utilities/wait-for.utility';

@Service()
export class Storage {
  public readonly loaderStateService: LoaderState = inject(LoaderState);

  protected stores: Map<string, UseStore> = new Map<string, UseStore>([]);

  private readonly isLoadingSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly isDbFailedSignal: WritableSignal<DbFail | undefined> = signal<DbFail | undefined>(undefined);

  public readonly isLoading: Signal<boolean> = this.isLoadingSignal.asReadonly();
  public readonly isDbFailed: Signal<DbFail | undefined> = this.isDbFailedSignal.asReadonly();

  private readonly requestGate: RequestGate = new RequestGate();

  private static createStore(
    name: string,
  ): UseStore {
    const dbName: string = `${ name }-db`;
    const storeName: string = `${ name }-store`;

    return createStore(
      dbName,
      storeName,
    );
  }

  public init(): void {
    this.loaderStateService.addLoader(
      this.isLoading,
      'Storage',
    );
    this.createStores();
  }

  public list(
    customStoreName?: string,
  ): Observable<KeyValueEntry[]> {
    this.assertValidStore(customStoreName);

    const request: (csn?: string) => Observable<KeyValueEntry[]> = (
      csn?: string,
    ): Observable<KeyValueEntry[]> => from(
      entries(
        this.getUseStore(csn),
      ),
    );

    return this.runProtectedRequest(
      request,
      [customStoreName],
      { customStoreName },
    );
  }

  public read<TValue = unknown>(
    key: IDBValidKey,
    customStoreName?: string,
  ): Observable<TValue> {
    this.assertValidStore(customStoreName);

    const request: (k: IDBValidKey, csn?: string) => Observable<TValue> = (
      k: IDBValidKey,
      csn?: string,
    ): Observable<TValue> => from(
      get(
        k,
        this.getUseStore(csn),
      ),
    ) as Observable<TValue>;

    return this.runProtectedRequest(
      request,
      [
        key,
        customStoreName,
      ],
      {
        customStoreName,
        key,
      },
    );
  }

  public create(
    key: IDBValidKey,
    value: unknown,
    customStoreName?: string,
  ): Observable<void> {
    this.assertValidStore(customStoreName);

    const request: (k: IDBValidKey, v: unknown, csn?: string) => Observable<void> = (
      k: IDBValidKey,
      v: unknown,
      csn?: string,
    ) => from(
      set(
        k,
        v,
        this.getUseStore(csn),
      ),
    );

    return this.runProtectedRequest(
      request,
      [
        key,
        value,
        customStoreName,
      ],
      {
        customStoreName,
        key,
        value,
      },
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
    this.assertValidStore(customStoreName);

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
      setMany(
        d,
        this.getUseStore(csn),
      ),
    );

    return this.runProtectedRequest(
      request,
      [
        dataEntries,
        customStoreName,
      ],
      {
        customStoreName,
        dataEntries,
      },
    );
  }

  public delete(
    key: IDBValidKey,
    customStoreName?: string,
  ): Observable<void> {
    this.assertValidStore(customStoreName);

    const request: (k: IDBValidKey, csn?: string) => Observable<void> = (
      k: IDBValidKey,
      csn?: string,
    ) => from(
      del(
        k,
        this.getUseStore(csn),
      ),
    );

    return this.runProtectedRequest(
      request,
      [
        key,
        customStoreName,
      ],
      {
        customStoreName,
        key,
      },
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

    Storage.createStore(customStoreName);

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

  private runProtectedRequest<TValue, TArgs extends unknown[]>(
    request: (...args: TArgs) => Observable<TValue>,
    args: TArgs,
    errorContext: {
      customStoreName?: string;
      key?: IDBValidKey;
      value?: unknown;
      dataEntries?: KeyValueEntry[]
    },
  ): Observable<TValue> {
    return waitForTurn(this.requestGate, this.isLoadingSignal)
      .pipe(
        switchMap((release: VoidFunction) => request(...args)
          .pipe(
            catchError((error) => {
              release();

              return this.reportError(
                error,
                request,
                errorContext,
              ) as Observable<TValue>;
            }),
            finalize(release),
          )),
      );
  }

  private getUseStore(
    customStoreName?: string,
  ): UseStore | undefined {
    return customStoreName ?
      (this.stores.get(customStoreName) as UseStore) :
      undefined;
  }

  private assertValidStore(
    customStoreName?: string,
  ): void {
    if (customStoreName && !this.stores.has(customStoreName)) {
      throw new Error('Invalid store!');
    }
  }

  private createStores(): void {
    const stores: string[] = [
      'task',
      'settings',
    ];

    stores.forEach(
      (storeName: string) => this.stores.set(
        storeName,
        Storage.createStore(storeName),
      ),
    );
  }

}
