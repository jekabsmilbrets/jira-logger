import { ApiSetting } from '@core/interfaces/api/api-setting.interface';
import { Setting } from '@core/models/setting.model';

export const adaptSetting = (apiSetting: ApiSetting): Setting => new Setting(
  {
    id: apiSetting.id,
    name: apiSetting.name,
    value: apiSetting.value,
    createdAt: apiSetting.createdAt ? new Date(apiSetting.createdAt) : undefined,
    updatedAt: apiSetting.updatedAt ? new Date(apiSetting.updatedAt) : undefined,
  },
);

export const adaptSettings = (apiSettings: ApiSetting[]): Setting[] => apiSettings
  .map((apiSetting: ApiSetting) => adaptSetting(apiSetting));
