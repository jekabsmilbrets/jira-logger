import type { DialogData } from '@shared/types/dialog-data.type';
import type { ErrorDialogIdbData } from '@shared/types/error-dialog-idb-data.type';

export interface ErrorDialogData extends DialogData {
  errorTitle: string;
  errorMessage?: string;
  idbData: ErrorDialogIdbData;
}
