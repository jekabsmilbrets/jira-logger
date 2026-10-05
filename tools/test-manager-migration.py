"""Exercise manager cutover paths without contacting Docker or real databases."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
DOCKER = r'''#!/bin/bash
echo "$*" >> "$TEST_ROOT/calls"
case "$1" in
  ps) [[ "$*" == *service=db* && "$LEGACY" == yes ]] && echo old-db; exit 0;;
  volume) [[ "$LEGACY" == yes || "$LEGACY" == volume ]] && echo jira-logger_dbData; exit 0;;
  exec)
    if [[ "$*" == *pg_dump* ]]; then echo backup; fi
    if [[ "$*" == *psql* ]]; then [[ "$FAIL_EXPORT" == yes ]] && exit 1; echo snapshot; fi
    exit 0;;
  compose)
    if [[ "$*" == *--input-type=module* ]]; then
      [[ -f "$TEST_ROOT/database" ]] || exit 10
      [[ "$INVALID" == yes ]] && exit 1
    fi
    if [[ "$*" == *import-postgres* || "$*" == *prepare-db* ]]; then touch "$TEST_ROOT/database"; fi
    exit 0;;
  *) exit 0;;
esac
'''


class MigrationTests(unittest.TestCase):
    def run_manager(self, *, action='build', legacy='no', existing=False,
                    marker='', fail_export='no', invalid='no'):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copy(ROOT / 'manager.sh', root / 'manager.sh')
            (root / '.docker').mkdir()
            envfile = root / '.docker/.env'
            envfile.write_text('KEEP_ME=unchanged\n' + marker)
            (root / 'tools').mkdir()
            (root / 'tools/export-postgres.sql').write_text('SELECT 1;')
            (root / 'docker').write_text(DOCKER)
            (root / 'docker').chmod(0o700)
            if existing:
                (root / 'database').touch()
            env = {**os.environ, 'PATH': str(root) + ':' + os.environ['PATH'],
                   'TEST_ROOT': str(root), 'LEGACY': legacy,
                   'FAIL_EXPORT': fail_export, 'INVALID': invalid}
            result = subprocess.run(['bash', 'manager.sh', '-a', action, '-t', 'off'],
                                    cwd=root, env=env, capture_output=True, text=True)
            return result.returncode, envfile.read_text(), (root / 'calls').read_text()

    def test_fresh_build(self):
        code, env, calls = self.run_manager()
        self.assertEqual(code, 0)
        self.assertIn('POSTGRES_MIGRATION_STATUS=not-required', env)
        self.assertIn('KEEP_ME=unchanged', env)
        self.assertNotIn('seed:', calls)

    def test_build_and_rebuild_import_before_cleanup(self):
        for action in ['build', 'rebuild']:
            with self.subTest(action=action):
                code, env, calls = self.run_manager(action=action, legacy='yes')
                self.assertEqual(code, 0)
                self.assertIn('POSTGRES_MIGRATION_STATUS=migrated', env)
                self.assertLess(calls.index('pg_dump'), calls.index('import-postgres'))
                self.assertLess(calls.index('import-postgres'), calls.index('prepare-db'))
                if action == 'rebuild':
                    self.assertLess(calls.index('import-postgres'), calls.index('down --remove-orphans'))

    def test_repeated_build_verifies_without_reimport(self):
        code, env, calls = self.run_manager(legacy='yes', existing=True,
                                          marker='POSTGRES_MIGRATION_STATUS=migrated\n')
        self.assertEqual(code, 0)
        self.assertIn('--input-type=module', calls)
        self.assertNotIn('import-postgres', calls)
        self.assertEqual(env.count('POSTGRES_MIGRATION_STATUS='), 1)

    def test_failed_export_never_initializes_or_marks_done(self):
        code, env, calls = self.run_manager(legacy='yes', fail_export='yes')
        self.assertNotEqual(code, 0)
        self.assertNotIn('POSTGRES_MIGRATION_STATUS=', env)
        self.assertNotIn('prepare-db', calls)
        self.assertNotIn('import-postgres', calls)

    def test_ambiguous_and_missing_sources_fail_closed(self):
        for options in [dict(legacy='yes', existing=True), dict(legacy='volume'),
                        dict(marker='POSTGRES_MIGRATION_STATUS=migrated\n'),
                        dict(existing=True, invalid='yes')]:
            with self.subTest(options=options):
                code, _, calls = self.run_manager(**options)
                self.assertNotEqual(code, 0)
                self.assertNotIn('prepare-db', calls)
                self.assertNotIn('down --remove-orphans', calls)


if __name__ == '__main__':
    unittest.main()
