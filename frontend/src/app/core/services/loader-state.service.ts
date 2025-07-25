import { Injectable } from '@angular/core';

import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, map, Observable, share, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoaderStateService {
  public isLoading$: Observable<boolean>;

  private loaderMarks: BehaviorSubject<Map<string, Observable<boolean>>> = new BehaviorSubject<Map<string, Observable<boolean>>>(
    new Map<string, Observable<boolean>>([]),
  );

  private debounceDelay = 50;

  constructor() {
    this.isLoading$ = this.loaderMarks.asObservable()
      .pipe(
        switchMap(
          (marks: Map<string, Observable<boolean>>) => combineLatest([...marks.values()]),
        ),
        debounceTime(this.debounceDelay),
        distinctUntilChanged(),
        map(
          (marks: boolean[]) => marks.includes(true),
        ),
        share(),
      );
  }

  public addLoader(
    loader: Observable<boolean>,
    name?: string,
  ): void {
    const loaderMarks: Map<string, Observable<boolean>> = this.loaderMarks.getValue();

    if (!name) {
      name = [...loaderMarks.keys()].length.toString();
    }

    loaderMarks.set(
      name,
      loader,
    );

    this.loaderMarks.next(loaderMarks);
  }
}
