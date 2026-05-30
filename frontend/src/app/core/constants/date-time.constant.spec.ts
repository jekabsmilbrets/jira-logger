import { appLocale, appTimeLogDateTimeFormat, appTimeZone } from './date-time.constant';

describe('Core Constants date-time.constant', () => {
  it('exports expected values', () => {
    expect(appTimeZone).toBe('Europe/Riga');
    expect(appLocale).toBe('lv');
    expect(appTimeLogDateTimeFormat).toBe('yyyy-MM-ddTHH:mm:ssZZZZZ');
  });
});
