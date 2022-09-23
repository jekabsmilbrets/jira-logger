import { Injectable } from '@angular/core';

import { environment }                                                     from 'environments/environment';
import { BehaviorSubject, combineLatest, map, Observable, switchMap, tap } from 'rxjs';

import { debounceDistinct } from '@core/utils/debounce-distinct.utility';


@Injectable(
  {
    providedIn: 'root',
  },
)
export class LoaderStateService {
  public isLoading$: Observable<boolean>;

  private loaderMarks: BehaviorSubject<Map<string, Observable<boolean>>> = new BehaviorSubject<Map<string, Observable<boolean>>>(
    new Map<string, Observable<boolean>>([]),
  );

  private debounceDelay = 100;

  constructor() {
    this.isLoading$ = this.loaderMarks.asObservable()
                          .pipe(
                            switchMap(
                              (marks: Map<string, Observable<boolean>>) => combineLatest([...marks.values()]),
                            ),
                            debounceDistinct(this.debounceDelay),
                            map(
                              (marks: boolean[]) => marks.includes(true),
                            ),
                          );
  }

  public addLoader(loader: Observable<boolean>, name?: string): void {
    const loaderMarks: Map<string, Observable<boolean>> = this.loaderMarks.getValue();

    if (!name) {
      name = [...loaderMarks.keys()].length.toString();
    }

    loaderMarks.set(
      name,
      loader.pipe(
        tap((isLoading: boolean) => {
          if (!environment.production && environment.debug) {
            console.log(`${name} is ${isLoading ? 'Loading' : 'Done loading'}!`);
          }
        }),
      ),
    );

    this.loaderMarks.next(loaderMarks);
  }
}
