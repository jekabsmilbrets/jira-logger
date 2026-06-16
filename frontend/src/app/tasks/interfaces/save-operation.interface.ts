import { Observable } from 'rxjs';

import { TimeLog } from '@shared/models/time-log.model';

export interface SaveOperation {
  request$: Observable<TimeLog | void>;
  onSuccess: (result: TimeLog | void) => void;
}
