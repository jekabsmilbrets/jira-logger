import assert from 'node:assert/strict';

import { test } from 'vitest';

import { parseDate } from './date.helpers.js';


test('explicit date normalization and PHP daylight-saving choices', () => {
  for (const [input, zone, expected] of [
    ['2026-02-30', 'Europe/Riga', '2026-03-01T22:00:00.000Z'],
    ['2026-04-31', 'Europe/Riga', '2026-04-30T21:00:00.000Z'],
    ['2026-03-29 03:30:00', 'Europe/Riga', '2026-03-29T01:30:00.000Z'],
    ['2026-10-25 03:30:00', 'Europe/Riga', '2026-10-25T01:30:00.000Z'],
    ['2026-03-08 02:30:00', 'America/New_York', '2026-03-08T07:30:00.000Z'],
    ['2026-11-01 01:30:00', 'America/New_York', '2026-11-01T05:30:00.000Z'],
    ['2026-10-25 01:30:00', 'Europe/London', '2026-10-25T01:30:00.000Z'],
    ['2026-04-05 01:45:00', 'Australia/Lord_Howe', '2026-04-04T15:15:00.000Z'],
    ['0', 'UTC', '1970-01-01T00:00:00.000Z'],
    ['1000000000999', 'UTC', '2001-09-09T01:46:40.000Z']
  ]) {
    assert.equal(parseDate(input, zone).toUTC().toISO(), expected, `${ zone } ${ input }`);
  }

  assert.throws(() => parseDate('next Tuesday', 'UTC'));
});
