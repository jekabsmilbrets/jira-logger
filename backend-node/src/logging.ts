import { appendFileSync } from 'node:fs';

export function fileLogStream(path: string) {
  return {
    write(line: string) {
      // Opening each append follows manager rotation without holding an old inode.
      appendFileSync(path, line, { mode: 0o666 });
    },
  };
}
