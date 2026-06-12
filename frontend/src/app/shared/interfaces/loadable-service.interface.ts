import { Observable } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

export interface LoadableService {
  isLoading$: Observable<boolean>;

  readonly loaderStateService: LoaderStateService;

  init(): void;
}
