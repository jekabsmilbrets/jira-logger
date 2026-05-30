import { Tag } from './tag.model';

describe('Shared Models tag.model', () => {
  it('assigns properties from constructor data', () => {
    const tag = new Tag({ id: '1', name: 'backend' } as any);
    expect(tag.id).toBe('1');
    expect(tag.name).toBe('backend');
  });
});
