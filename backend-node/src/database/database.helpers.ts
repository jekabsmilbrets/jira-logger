export function requiredRow<T>(
  rows: T[],
): T {
  const row: T | undefined = rows[0];

  if (!row) {
    throw new Error('Expected a database row');
  }

  return row;
}

export function errorCode(
  error: unknown,
): unknown {
  if (error !== null && typeof error === 'object' && 'errcode' in error && [1555, 2067].includes(Number(error.errcode))) {
return 'unique';
}

  return error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
}
