import { Base } from './base.model';

describe('Core Models base.model', () => {
  it('sets and gets id', () => {
    const base = new Base();
    base.id = 'abc';

    expect(base.id).toBe('abc');
  });

  it('sets and gets createdAt', () => {
    const base = new Base();
    const date = new Date('2024-01-01T00:00:00.000Z');
    base.createdAt = date;

    expect(base.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });

  it('returns undefined updatedAt when not set', () => {
    const base = new Base();

    expect(base.updatedAt).toBeUndefined();
  });

  it('sets and gets updatedAt', () => {
    const base = new Base();
    const date = new Date('2024-01-02T00:00:00.000Z');
    base.updatedAt = date;

    expect(base.updatedAt?.toISOString()).toBe('2024-01-02T00:00:00.000Z');
  });
});
