import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../dist/db.js';
import { databaseUrl } from '../dist/config.js';
import { migrate } from '../dist/migrations.js';
import { seed, audit } from '../dist/maintenance.js';

if (!process.env.DATABASE_URL?.includes('@127.0.0.1:55439/compatibility')) throw new Error('Disposable database required');
after(() => db.end());

test('Doctrine URL parameters are removed without changing credentials or SSL options', () => {
  assert.equal(databaseUrl('postgresql://a:b@localhost/db?serverVersion=13&charset=utf8&sslmode=require'), 'postgresql://a:b@localhost/db?sslmode=require');
});
test('PHP ledger is recognized without replaying migrations', async () => {
  const before = (await db.query('SELECT * FROM doctrine_migration_versions ORDER BY version')).rows;
  await migrate();
  await migrate();
  assert.deepEqual((await db.query('SELECT * FROM doctrine_migration_versions ORDER BY version')).rows, before);
  assert.equal(before.length, 2);
});
test('seeds are idempotent, preserve edits, unload by name, and reject unknown seeds', async () => {
  await seed('setting');
  await seed('tag');
  await db.query("UPDATE setting SET value='https://changed.invalid' WHERE name='jira.host'");
  await seed('setting');
  assert.equal((await db.query("SELECT value FROM setting WHERE name='jira.host'")).rows[0].value, 'https://changed.invalid');
  await seed('setting', true);
  await seed('tag', true);
  assert.equal((await db.query('SELECT * FROM setting')).rowCount, 0);
  assert.equal((await db.query('SELECT * FROM tag')).rowCount, 0);
  await assert.rejects(seed('invalid'), RangeError);
  assert.deepEqual(await audit(), { duplicates: [], invalidTimeLogs: [] });
});
