import { getDateParts } from './get-date-parts.utility';

describe('Core Utils get-date-parts.utility', () => {
  it('returns year month day', () => {
    const date = new Date('2024-05-10T12:00:00.000Z');

    expect(getDateParts(date)).toEqual([
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ]);
  });
});
