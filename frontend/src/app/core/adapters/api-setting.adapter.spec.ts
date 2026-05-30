import { adaptSetting, adaptSettings } from './api-setting.adapter';

describe('Core Adapters api-setting.adapter', () => {
  it('adapts setting with dates', () => {
    const result = adaptSetting({
      id: '1',
      name: 'theme',
      value: 'dark',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    });

    expect(result.id).toBe('1');
    expect(result.name).toBe('theme');
    expect(result.value).toBe('dark');
    expect(result.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(result.updatedAt?.toISOString()).toBe('2024-01-02T00:00:00.000Z');
  });

  it('adapts setting without optional dates', () => {
    const result = adaptSetting({
      id: '1',
      name: 'theme',
      value: 'dark',
      createdAt: '',
    } as any);

    expect(Number.isNaN(result.createdAt.getTime())).toBe(true);
    expect(result.updatedAt).toBeUndefined();
  });

  it('adapts setting array', () => {
    const results = adaptSettings([
      { id: '1', name: 'a', value: 'x', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: '2', name: 'b', value: 'y', createdAt: '2024-01-02T00:00:00.000Z' },
    ] as any);

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('a');
    expect(results[1].name).toBe('b');
  });
});
