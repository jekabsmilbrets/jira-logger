import { inject, Service, Signal, signal } from '@angular/core';

import { UseStore } from 'idb-keyval';
import { catchError, finalize, from, map, Observable, of, switchMap, take, throwError } from 'rxjs';

import { DbFailInterface } from '@core/interfaces/db-fail.interface';
import { LoaderStateService } from '@core/services/loader-state.service';
import { storageIdbGateway } from '@core/services/storage-idb.gateway';
import { KeyValueEntry } from '@core/types/key-value-entry.type';
import { RequestGate } from '@core/utils/request-gate.utility';
import { waitForTurn } from '@core/utils/wait-for.utility';

import { LoadableService } from '@shared/interfaces/loadable-service.interface';

@Service()
export class StorageService implements LoadableService {
  public readonly loaderStateService: LoaderStateService = inject(LoaderStateService);

  protected stores: Map<string, UseStore> = new Map<string, UseStore>([]);

  private readonly isLoadingSignal = signal<boolean>(false);
  private readonly isDbFailedSignal = signal<DbFailInterface | undefined>(undefined);
  private readonly requestGate = new RequestGate();

  public get isLoading(): Signal<boolean> {
    return this.isLoadingSignal.asReadonly();
  }

  public get isDbFailed(): Signal<DbFailInterface | undefined> {
    return this.isDbFailedSignal.asReadonly();
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
      this.isLoading,
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

    return waitForTurn(this.requestGate, this.isLoadingSignal)
      .pipe(
        switchMap((release: VoidFunction) => request(customStoreName)
          .pipe(
            catchError((error) => {
              release();
              return this.reportError(
                error,
                request,
                {
                  customStoreName,
                },
              );
            }),
            finalize(release),
          )),
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

    return waitForTurn(this.requestGate, this.isLoadingSignal)
      .pipe(
        switchMap((release: VoidFunction) => request(
          key,
          customStoreName,
        )
          .pipe(
            catchError((error) => {
              release();
              return this.reportError(
                error,
                request,
                {
                  customStoreName,
                  key,
                },
              );
            }),
            finalize(release),
          )),
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

    return waitForTurn(this.requestGate, this.isLoadingSignal)
      .pipe(
        switchMap((release: VoidFunction) => request(
          key,
          value,
          customStoreName,
        )
          .pipe(
            catchError((error) => {
              release();
              return this.reportError(
                error,
                request,
                {
                  customStoreName,
                  key,
                  value,
                },
              );
            }),
            finalize(release),
          )),
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

    return waitForTurn(this.requestGate, this.isLoadingSignal)
      .pipe(
        switchMap((release: VoidFunction) => request(
          dataEntries,
          customStoreName,
        )
          .pipe(
            catchError((error) => {
              release();
              return this.reportError(
                error,
                request,
                {
                  customStoreName,
                  dataEntries,
                },
              );
            }),
            finalize(release),
          )),
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

    return waitForTurn(this.requestGate, this.isLoadingSignal)
      .pipe(
        switchMap((release: VoidFunction) => request(
          key,
          customStoreName,
        )
          .pipe(
            catchError((error) => {
              release();
              return this.reportError(
                error,
                request,
                {
                  customStoreName,
                  key,
                },
              );
            }),
            finalize(release),
          )),
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

}
