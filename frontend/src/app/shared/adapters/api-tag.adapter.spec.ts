import { adaptTag, adaptTags } from './api-tag.adapter';

describe('Shared Adapters api-tag.adapter', () => {
  it('adapts one tag', () => {
    const tag = adaptTag({ id: '1', name: 'backend', createdAt: '2024-01-01T00:00:00.000Z' } as any);
    expect(tag.id).toBe('1');
    expect(tag.name).toBe('backend');
  });

  it('adapts many tags', () => {
    expect(adaptTags([{ id: '1', name: 'a', createdAt: '' }, { id: '2', name: 'b', createdAt: '' }] as any)).toHaveLength(2);
  });
});
