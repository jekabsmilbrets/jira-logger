import { environment } from '@environments/environment';

import type { RuntimeConfig } from '@core/interfaces/runtime-config.interface';

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
    const runtimeEntries: [keyof RuntimeConfig, 'apiHost' | 'apiBase'][] = [
      ['apiHost', 'apiHost'],
      ['apiBase', 'apiBase'],
    ];

    runtimeEntries.forEach(([configKey, environmentKey]) => {
      const value: string | undefined = config[configKey];

      if (typeof value === 'string' && value.trim().length > 0) {
        environment[environmentKey] = value;
      }
    });
  } catch (error: unknown) {
    console.error(
      `Runtime API config missing or invalid at ${ runtimeConfigPath }; falling back to build-time environment values.`,
      error,
    );
  }
}
