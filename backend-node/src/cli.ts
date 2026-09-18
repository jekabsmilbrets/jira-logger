import { db } from './db.js';
import { migrate } from './migrations.js';
import { audit, prepareDatabase, seed } from './maintenance.js';

try {
  const [command, name = ''] = process.argv.slice(2);
  switch (command) {
    case 'prepare-db': await prepareDatabase(); break;
    case 'migrate': await migrate(); break;
    case 'migrations:status': console.table((await db.query('SELECT * FROM doctrine_migration_versions ORDER BY version')).rows); break;
    case 'seed:setting': await seed('setting'); break;
    case 'seed:tag': await seed('tag'); break;
    case 'seed:load': await seed(name); break;
    case 'seed:unload': await seed(name, true); break;
    case 'app:audit:jira-sync-data': console.log(JSON.stringify(await audit(), null, 2)); break;
    default: throw new RangeError('Unsupported maintenance command');
  }
} catch (error) {
  console.error(error instanceof RangeError ? error.message : 'Database maintenance failed');
  process.exitCode = error instanceof RangeError ? 2 : 1;
} finally { await db.end(); }
