import { Signal } from '@angular/core';

import { LoaderStateService } from '@core/services/loader-state.service';

export interface LoadableService {
  isLoading: Signal<boolean>;

  readonly loaderStateService: LoaderStateService;

  init(): void;
}
