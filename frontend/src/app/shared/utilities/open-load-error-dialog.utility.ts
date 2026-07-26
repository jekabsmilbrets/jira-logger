import { from, type Observable, switchMap, take, throwError } from 'rxjs';

import type { ErrorDialog } from '@shared/services/error-dialog';
import type { AsyncLoader } from '@shared/types/async-loader.type';
import type { ErrorDialogIdbData } from '@shared/types/error-dialog-idb-data.type';

export const openLoadErrorDialog: (
  loadErrorDialogService: AsyncLoader<ErrorDialog>,
  error: unknown,
  idbData: ErrorDialogIdbData,
) => Observable<never> = (
  loadErrorDialogService: AsyncLoader<ErrorDialog>,
  error: unknown,
  idbData: ErrorDialogIdbData,
): Observable<never> => {
  return from(loadErrorDialogService())
    .pipe(
      switchMap((errorDialogService) => errorDialogService.openDialog({
        errorTitle: 'Error while doing db action :D',
        errorMessage: JSON.stringify(error),
        idbData,
      })),
      take(1),
      switchMap(() => throwError(() => error)),
    );
};
