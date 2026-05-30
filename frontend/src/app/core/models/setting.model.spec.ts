import { Setting } from './setting.model';

describe('Core Models setting.model', () => {
  it('assigns base and own properties', () => {
    const createdAt = new Date('2024-01-01T00:00:00.000Z');
    const updatedAt = new Date('2024-01-02T00:00:00.000Z');

    const setting = new Setting({
      id: '1',
      name: 'theme',
      value: 'dark',
      createdAt,
      updatedAt,
    } as Partial<Setting>);

    expect(setting.id).toBe('1');
    expect(setting.name).toBe('theme');
    expect(setting.value).toBe('dark');
    expect(setting.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(setting.updatedAt?.toISOString()).toBe('2024-01-02T00:00:00.000Z');
  });
});
