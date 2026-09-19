import { appendFileSync } from 'node:fs';

export class FileLogStream {
  constructor(private readonly path: string) { }

  write(line: string): void {
    // Opening each append follows manager rotation without holding an old inode.
    appendFileSync(this.path, line, { mode: 0o666 });
  }
}
