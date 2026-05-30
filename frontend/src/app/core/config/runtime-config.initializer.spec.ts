import { environment } from 'environments/environment';

import { runtimeConfigInitializer } from './runtime-config.initializer';

describe('Core Config runtime-config.initializer', () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUri = document.baseURI;
  const originalHost = environment['apiHost'];
  const originalBase = environment['apiBase'];

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(document, 'baseURI', {
      configurable: true,
      value: 'https://example.com/app/',
    });
    environment['apiHost'] = originalHost;
    environment['apiBase'] = originalBase;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(document, 'baseURI', {
      configurable: true,
      value: originalBaseUri,
    });
    environment['apiHost'] = originalHost;
    environment['apiBase'] = originalBase;
  });

  it('applies runtime values when response is valid', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        apiHost: 'https://runtime-host',
        apiBase: '/runtime-api',
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await runtimeConfigInitializer();

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/app/runtime-config.json', { cache: 'no-store' });
    expect(environment['apiHost']).toBe('https://runtime-host');
    expect(environment['apiBase']).toBe('/runtime-api');
  });

  it('keeps previous values when runtime values are blank', async () => {
    environment['apiHost'] = 'https://keep-host';
    environment['apiBase'] = '/keep-base';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ apiHost: '  ', apiBase: '' }),
    }) as unknown as typeof fetch;

    await runtimeConfigInitializer();

    expect(environment['apiHost']).toBe('https://keep-host');
    expect(environment['apiBase']).toBe('/keep-base');
  });

  it('logs and falls back when fetch fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch;

    await runtimeConfigInitializer();

    expect(errorSpy).toHaveBeenCalled();
  });

  it('logs and falls back when response is not ok', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    await runtimeConfigInitializer();

    expect(errorSpy).toHaveBeenCalled();
  });
});
