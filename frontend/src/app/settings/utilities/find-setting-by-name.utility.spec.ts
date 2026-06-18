import { describe, expect, it } from 'vitest';

import { Setting } from '@core/models/setting.model';

import { findSettingByName } from './find-setting-by-name.utility';

describe('find-setting-by-name.utility', () => {
  it('returns the matching setting by name', () => {
    const timezone = new Setting({ id: '1', name: 'timezone', value: 'Europe/Vienna' });
    const locale = new Setting({ id: '2', name: 'locale', value: 'lv-LV' });

    expect(findSettingByName([timezone, locale], 'locale')).toBe(locale);
  });

  it('returns undefined when no setting matches the name', () => {
    expect(findSettingByName([], 'missing')).toBeUndefined();
  });
});
