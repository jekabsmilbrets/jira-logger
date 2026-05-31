type UnixMsType = number | string;

export const toUnixMs: <T extends UnixMsType = number>(date: Date, mode?: 'number' | 'string') => T = <T extends UnixMsType = number>(
  date: Date,
  mode: 'number' | 'string' = 'number',
): T => {
  const unixMs: number = date.getTime();

  return (mode === 'string' ? String(unixMs) : unixMs) as T;
};
