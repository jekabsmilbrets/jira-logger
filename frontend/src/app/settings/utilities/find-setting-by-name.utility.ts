import { Setting } from '@core/models/setting.model';

export const findSettingByName: <TName extends string>(
  settings: Setting[],
  name: TName,
) => Setting | undefined = <TName extends string>(
  settings: Setting[],
  name: TName,
): Setting | undefined => settings.find(
  (setting: Setting) => setting.name === name,
);
