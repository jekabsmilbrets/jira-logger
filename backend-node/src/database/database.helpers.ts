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
  return error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
}
