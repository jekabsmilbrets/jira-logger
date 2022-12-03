import { DialogData } from '@shared/interfaces/dialog-data.interface';


export interface ErrorDialogDataInterface extends DialogData {
  errorTitle: string;
  errorMessage?: string;
  idbData: any;
}
