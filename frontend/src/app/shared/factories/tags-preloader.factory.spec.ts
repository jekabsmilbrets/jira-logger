import { of } from 'rxjs';

import { tagsPreloaderFactory } from './tags-preloader.factory';

describe('Shared Factories tags-preloader.factory', () => {
  it('preloads tags via provider', async () => {
    const provider = {
      preloadForInit: vi.fn(() => of([{ id: '1', name: 'x' }] as any)),
    } as any;

    const result = await tagsPreloaderFactory(provider)();

    expect(provider.preloadForInit).toHaveBeenCalledOnce();
    expect(result).toHaveLength(1);
  });
});
