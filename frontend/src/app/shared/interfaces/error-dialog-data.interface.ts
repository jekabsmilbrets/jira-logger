import { DialogData } from '@shared/types/dialog-data.type';

export interface ErrorDialogDataInterface extends DialogData {
  errorTitle: string;
  errorMessage?: string;
  idbData: any;
}
