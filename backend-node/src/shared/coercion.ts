export function boolean(value: string): boolean { return /^(1|true|yes|on)$/i.test(value.trim()); }

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? Object.fromEntries(Object.entries(value)) : {};
}
