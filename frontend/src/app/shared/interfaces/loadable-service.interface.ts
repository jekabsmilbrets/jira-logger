import { LoaderStateService } from '@core/services/loader-state.service';
import { Observable } from 'rxjs';

export interface LoadableService {
  isLoading$: Observable<boolean>;

  readonly loaderStateService: LoaderStateService;

  init(): void;
}
