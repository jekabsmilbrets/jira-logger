import { loadableServicesInitializerFactory } from './loadable-services-initializer.factory';

describe('Shared Factories loadable-services-initializer.factory', () => {
  it('calls init on all services', async () => {
    const s1 = { init: vi.fn(), isLoading: undefined, loaderStateService: undefined } as any;
    const s2 = { init: vi.fn(), isLoading: undefined, loaderStateService: undefined } as any;

    await loadableServicesInitializerFactory(s1, s2)();

    expect(s1.init).toHaveBeenCalledOnce();
    expect(s2.init).toHaveBeenCalledOnce();
  });
});
