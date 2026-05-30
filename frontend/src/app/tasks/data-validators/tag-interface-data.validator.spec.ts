import { Tag } from '@shared/models/tag.model';
import { describe, expect, it } from 'vitest';

import { validateTagInterfaceData, validateTagsInterfaceData } from './tag-interface-data.validator';

describe('Tasks Data Validators tag-interface-data.validator', () => {
  const tags: Tag[] = [
    new Tag({ id: '1', name: 'Backend' }),
    new Tag({ id: '2', name: 'Frontend' }),
  ];

  it('finds a tag by string name case-insensitively', () => {
    expect(validateTagInterfaceData('backend', tags)).toEqual({ id: '1', name: 'Backend' });
    expect(validateTagInterfaceData('FrOnTeNd', tags)).toEqual({ id: '2', name: 'Frontend' });
  });

  it('finds a tag by object id fields and exact name fallback', () => {
    expect(validateTagInterfaceData({ id: '2' }, tags)).toEqual({ id: '2', name: 'Frontend' });
    expect(validateTagInterfaceData({ _id: '1' }, tags)).toEqual({ id: '1', name: 'Backend' });
    expect(validateTagInterfaceData({ _name: 'Backend' }, tags)).toEqual({ id: '1', name: 'Backend' });
    expect(validateTagInterfaceData({ name: 'Frontend' }, tags)).toEqual({ id: '2', name: 'Frontend' });
  });

  it('returns undefined for non-matching values', () => {
    expect(validateTagInterfaceData('missing', tags)).toBeUndefined();
    expect(validateTagInterfaceData({ _id: '999' }, tags)).toBeUndefined();
    expect(validateTagInterfaceData(undefined, tags)).toBeUndefined();
  });

  it('maps only matching tags when validating an array', () => {
    const out = validateTagsInterfaceData([
      'backend',
      { _id: '2' },
      { name: 'missing' },
    ], tags);

    expect(out).toEqual([
      { id: '1', name: 'Backend' },
      { id: '2', name: 'Frontend' },
    ]);
  });
});
