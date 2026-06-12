import { getNestedObject } from './get-nested-object.util';

describe('Shared Utils get-nested-object.util', () => {
  it('reads nested value', () => {
    expect(getNestedObject({ a: { b: 5 } }, ['a', 'b'])).toBe(5);
  });

  it('returns undefined for missing path', () => {
    expect(getNestedObject({ a: {} }, ['a', 'c'])).toBeUndefined();
  });
});
