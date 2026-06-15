import { computed, effect, Service, Signal, signal } from '@angular/core';

@Service()
export class LoaderStateService {
  private readonly loaderMarks = signal<Map<string, Signal<boolean>>>(new Map<string, Signal<boolean>>());
  private readonly aggregateLoading = computed(() => [...this.loaderMarks().values()].some((loader: Signal<boolean>) => loader()));
  private readonly isLoadingSignal = signal<boolean>(false);
  public readonly isLoading: Signal<boolean> = this.isLoadingSignal.asReadonly();

  private readonly debounceDelay = 50;

  constructor() {
    effect((onCleanup) => {
      const nextValue: boolean = this.aggregateLoading();
      const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
        this.isLoadingSignal.set(nextValue);
      }, this.debounceDelay);

      onCleanup(() => clearTimeout(timeoutId));
    });
  }

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
