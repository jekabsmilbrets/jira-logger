import { environment } from '@environments/environment';

import { RuntimeConfig } from '@core/interfaces/runtime-config.interface';

export async function runtimeConfigInitializer(): Promise<void> {
  const runtimeConfigPath: string = new URL(
    'runtime-config.json',
    document.baseURI,
  ).toString();

  try {
    const response: Response = await fetch(runtimeConfigPath, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`HTTP ${ response.status }`);
    }

    const config: RuntimeConfig = await response.json();

    if (typeof config.apiHost === 'string' && config.apiHost.trim().length > 0) {
      environment['apiHost'] = config.apiHost;
    }

    if (typeof config.apiBase === 'string' && config.apiBase.trim().length > 0) {
      environment['apiBase'] = config.apiBase;
    }
  } catch (error: unknown) {
    console.error(
      `Runtime API config missing or invalid at ${ runtimeConfigPath }; falling back to build-time environment values.`,
      error,
    );
  }
}
