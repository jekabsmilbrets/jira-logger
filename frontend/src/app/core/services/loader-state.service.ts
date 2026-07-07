import { computed, debounced, Service, type Signal, signal, type WritableSignal } from '@angular/core';

@Service()
export class LoaderStateService {
  private readonly loaderMarks: WritableSignal<Map<string, Signal<boolean>>> = signal<Map<string, Signal<boolean>>>(
    new Map<string, Signal<boolean>>(),
  );
  private readonly aggregateLoading: Signal<boolean> = computed(
    () => [
      ...this.loaderMarks().values(),
    ].some(
      (loader: Signal<boolean>) => loader(),
    ),
  );
  private readonly debounceDelay: number = 50;

  public readonly isLoading: Signal<boolean> = debounced(
    this.aggregateLoading,
    this.debounceDelay,
  ).value;

  public addLoader(
    loader: Signal<boolean>,
    name: string,
  ): void {
    const loaderMarks: Map<string, Signal<boolean>> = new Map<string, Signal<boolean>>(this.loaderMarks());

    if (loaderMarks.has(name)) {
      throw new Error(`Loader with name "${ name }" already exists.`);
    }

    loaderMarks.set(
      name,
      loader,
    );

    this.loaderMarks.set(loaderMarks);
  }
}
