import { Observable, Subscription, timer } from 'rxjs';


export const debounceDistinct = <T>(delay: number) =>
  (source: Observable<T>): Observable<T> => new Observable(subscriber => {
    let hasValue = false;
    let lastValue: T | undefined;
    let durationSub: Subscription | undefined;

    const emit = () => {
      durationSub?.unsubscribe();
      durationSub = undefined;
      if (hasValue) {
        // We have a value! Free up memory first, then emit the value.
        hasValue = false;
        const value = lastValue;
        lastValue = undefined;
        subscriber.next(value);
      }
    };

    return source.subscribe(
      {
        next: (value: T) => {
          // new value received cancel timer
          durationSub?.unsubscribe();
          // emit lastValue if the value has changed
          if (hasValue && value !== lastValue) {
            const value2 = lastValue;
            subscriber.next(value2);
          }
          hasValue = true;
          lastValue = value;
          // restart timer
          durationSub = timer(delay).subscribe(() => {
            emit();
          });
        },
        error: (error) => {
        },
        complete: () => {
          emit();
          subscriber.complete();
          lastValue = undefined;
        },
      });
  });
