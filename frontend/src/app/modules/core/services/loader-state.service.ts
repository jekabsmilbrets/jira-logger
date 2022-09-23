import { Injectable }                                                                       from '@angular/core';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map, Observable, switchMap } from 'rxjs';


@Injectable(
  {
    providedIn: 'root',
  },
)
export class LoaderStateService {
  public isLoading$: Observable<boolean>;

  private loaderMarks: BehaviorSubject<Observable<boolean>[]> = new BehaviorSubject<Observable<boolean>[]>([]);

  constructor() {
    this.isLoading$ = this.loaderMarks.asObservable()
                          .pipe(
                            switchMap(
                              (marks: Observable<boolean>[]) => combineLatest(marks),
                            ),
                            distinctUntilChanged(),
                            map(
                              (marks: boolean[]) => marks.includes(true),
                            ),
                          );
  }

  public addLoader(loader: Observable<boolean>): void {
    const loaderMarks: Observable<boolean>[] = this.loaderMarks.getValue();

    loaderMarks.push(loader);

    this.loaderMarks.next(loaderMarks);
  }
}
