import { computed, Service, type Signal, signal, type WritableSignal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { debounceTime } from 'rxjs';

@Service()
export class LoaderStateService {
  private readonly loaderMarks: WritableSignal<Map<string, Signal<boolean>>> = signal<Map<string, Signal<boolean>>>(new Map<string, Signal<boolean>>());
  private readonly aggregateLoading: Signal<boolean> = computed(() => [...this.loaderMarks().values()].some((loader: Signal<boolean>) => loader()));
  private readonly debounceDelay: number = 50;

  public readonly isLoading: Signal<boolean> = toSignal(
    toObservable(this.aggregateLoading).pipe(debounceTime(this.debounceDelay)),
    { initialValue: false },
  );

  public addLoader(
    loader: Signal<boolean>,
    name?: string,
  ): void {
    const loaderMarks: Map<string, Signal<boolean>> = new Map<string, Signal<boolean>>(this.loaderMarks());

    if (!name) {
      name = [...loaderMarks.keys()].length.toString();
    }

    loaderMarks.set(
      name,
      loader,
    );

    this.loaderMarks.set(loaderMarks);
  }
}
