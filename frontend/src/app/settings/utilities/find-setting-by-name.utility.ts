import { Setting } from '@core/models/setting.model';

export function findSettingByName<TName extends string>(
  settings: Setting[],
  name: TName,
): Setting | undefined {
  return settings.find(
    (setting: Setting) => setting.name === name,
  );
}

export function getStringSettingValue<TName extends string>(
  settings: Setting[],
  name: TName,
  defaultValue: string,
): string {
  const setting: Setting | undefined = findSettingByName(settings, name);

  return typeof setting?.value === 'string' ?
    setting.value :
    defaultValue;
}

export function getBooleanLikeSettingValue<TName extends string>(
  settings: Setting[],
  name: TName,
  defaultValue: string | boolean,
): string | boolean {
  const setting: Setting | undefined = findSettingByName(settings, name);
  const value: unknown = setting?.value;

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return defaultValue;
  }

  if (value.toLowerCase() === 'true') {
    return true;
  }

  if (value.toLowerCase() === 'false') {
    return false;
  }

  return value;
}

export function buildChangedSetting<TName extends string>(
  settings: Setting[],
  name: TName,
  nextValue: string | boolean,
  currentValue: string | boolean,
  shouldPersist: (value: string | boolean) => boolean = () => true,
): Setting | undefined {
  const originalSetting: Setting | undefined = findSettingByName(settings, name);

  if (!originalSetting || currentValue === nextValue || !shouldPersist(nextValue)) {
    return undefined;
  }

  return new Setting({
    ...originalSetting,
    value: typeof nextValue === 'boolean' ? String(nextValue) : nextValue,
  });
}
