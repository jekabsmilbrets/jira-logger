import { BehaviorSubject, filter, Observable, take, tap } from 'rxjs';

export const waitForTurn = (
  isLoading$: Observable<boolean>,
  isLoadingSubject: BehaviorSubject<boolean>,
) =>
  isLoading$
    .pipe(
      filter((isLoading: boolean) => !isLoading),
      take(1),
      tap(() => isLoadingSubject.next(true)),
    );
