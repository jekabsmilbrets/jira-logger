import { Setting } from '@core/models/setting.model';

export interface SettingsSaveEvent {
  changedSettings: Setting[];
  successMessage: string;
}
