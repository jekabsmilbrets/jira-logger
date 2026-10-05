import { pathToFileURL } from 'node:url';

import { importPostgres, restoreBackup } from '@database/postgres-import';

async function main(): Promise<void> {
  const [command, source, destination, ...extra] = process.argv.slice(2);

  if (!source || !destination || extra.length || !['import-postgres', 'restore'].includes(command ?? '')) {
    throw new Error('Usage: node dist/db-tools.js import-postgres SNAPSHOT.json DESTINATION.sqlite | restore BACKUP.sqlite DESTINATION.sqlite');
  }

  if (command === 'import-postgres') {
    const counts: Record<string, number> = await importPostgres(source, destination);
    console.log(JSON.stringify({
      imported: counts
    }));
  } else {
    restoreBackup(source, destination);
    console.log('Backup restored and integrity verified.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error('Database operation failed. Check inputs, file permissions, application locks, and the documented snapshot layout.');
    process.exitCode = 1;
  });
}
