import { columnValue } from './column-value.utility';

describe('Shared Utils column-value.util', () => {
  it('reads nested value by dot path', () => {
    expect(columnValue({ a: { b: 'x' } }, 'a.b')).toBe('x');
  });

  it('joins arrays with and without callback', () => {
    expect(columnValue({ tags: ['a', 'b'] }, 'tags', true)).toBe('a, b');
    expect(columnValue({ tags: [{ name: 'a' }, { name: 'b' }] }, 'tags', true, (x: any) => x.name)).toBe('a, b');
  });

  it('returns empty string for missing join path', () => {
    expect(columnValue({}, 'tags', true)).toBe('');
  });
});
