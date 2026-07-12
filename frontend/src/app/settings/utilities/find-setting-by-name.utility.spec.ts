import { describe, expect, it } from 'vitest';

import { Setting } from '@core/models/setting.model';

import { buildChangedSetting, findSettingByName, getBooleanLikeSettingValue, getStringSettingValue } from './find-setting-by-name.utility';

describe('Settings Utility find-setting-by-name.utility', () => {
  it('returns the matching setting by name', () => {
    const timezone = new Setting({ id: '1', name: 'timezone', value: 'Europe/Vienna' });
    const locale = new Setting({ id: '2', name: 'locale', value: 'lv-LV' });

    expect(findSettingByName([timezone, locale], 'locale')).toBe(locale);
  });

  it('returns undefined when no setting matches the name', () => {
    expect(findSettingByName([], 'missing')).toBeUndefined();
  });

  it('reads string settings with fallback', () => {
    const locale = new Setting({ id: '2', name: 'locale', value: 'lv-LV' });

    expect(getStringSettingValue([locale], 'locale', 'en-US')).toBe('lv-LV');
    expect(getStringSettingValue([locale], 'timezone', 'UTC')).toBe('UTC');
  });

  it('normalizes boolean-like setting values', () => {
    expect(getBooleanLikeSettingValue([new Setting({ name: 'enabled', value: 'true' })], 'enabled', false)).toBe(true);
    expect(getBooleanLikeSettingValue([new Setting({ name: 'enabled', value: 'FALSE' })], 'enabled', true)).toBe(false);
    expect(getBooleanLikeSettingValue([new Setting({ name: 'host', value: 'https://jira.local' })], 'host', '')).toBe('https://jira.local');
    expect(getBooleanLikeSettingValue([new Setting({ name: 'enabled', value: 1 as any })], 'enabled', false)).toBe(false);
  });

  it('builds changed settings only when value changes and should persist', () => {
    const setting = new Setting({ id: '1', name: 'enabled', value: 'false' });

    expect(buildChangedSetting([setting], 'enabled', true, false)?.value).toBe('true');
    expect(buildChangedSetting([setting], 'enabled', false, false)).toBeUndefined();
    expect(buildChangedSetting([setting], 'enabled', '', false, () => false)).toBeUndefined();
  });
});
