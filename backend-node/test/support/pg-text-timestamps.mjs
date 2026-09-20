// The unchanged migration fixture creates its own pg.Client and compares text
// timestamps. Previously importing migrations changed pg's process-wide parsers.
// Keep that fixture assumption in its test process, outside application imports.
import pg from 'pg';

for (const oid of [1082, 1114, 1184]) pg.types.setTypeParser(oid, value => value);
