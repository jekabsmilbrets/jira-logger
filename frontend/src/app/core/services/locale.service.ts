import { registerLocaleData } from '@angular/common';
import { effect, inject, Service, Signal, signal } from '@angular/core';

import { environment } from '@environments/environment';

import { LocaleOption } from '@core/interfaces/locale-option.interface';
import { Setting } from '@core/models/setting.model';
import { SettingsService } from '@core/services/settings.service';

import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';

@Service()
export class LocaleService {
  private readonly settingsService: SettingsService | null = inject(SettingsService, { optional: true });

  public readonly localeOptions: LocaleOption[] = [
    { label: 'Latvian (lv-LV)', value: 'lv-LV' },
    { label: 'English (en-US)', value: 'en-US' },
    { label: 'Spanish (es-ES)', value: 'es-ES' },
    { label: 'German (de-DE)', value: 'de-DE' },
    { label: 'French (fr-FR)', value: 'fr-FR' },
  ];
  private readonly supportedLocales: string[] = this.localeOptions.map((option: LocaleOption) => option.value);
  private readonly localeLoaders: Record<string, () => Promise<{ default: unknown }>> = {
    'lv-LV': () => import('@angular/common/locales/lv'),
    'en-US': () => import('@angular/common/locales/en'),
    'es-ES': () => import('@angular/common/locales/es'),
    'de-DE': () => import('@angular/common/locales/de'),
    'fr-FR': () => import('@angular/common/locales/fr'),
  };
  private readonly loadedLocales: Set<string> = new Set<string>(['en-US']);
  private readonly loadingLocales: Map<string, Promise<void>> = new Map<string, Promise<void>>();

  private readonly _locale = signal<string>(environment['appLocale'] as string);
  public readonly localeSignal: Signal<string> = this._locale.asReadonly();

  public get locale(): string {
    return this._locale();
  }

  constructor() {
    this.setLocale(environment['appLocale'] as string);
    this.applyLocaleFromSettings(this.settingsService?.settings());

    effect(() => {
      this.applyLocaleFromSettings(this.settingsService?.settings());
    });
  }

  private isSupportedLocale(locale: string): boolean {
    return this.supportedLocales.includes(locale.trim());
  }

  private setLocale(locale: string): void {
    const normalizedLocale: string = locale.trim();

    this._locale.set(normalizedLocale);
    void this.ensureLocaleDataLoaded(normalizedLocale);
  }

  private applyLocaleFromSettings(settings: Setting[] | undefined): void {
    const locale: string | undefined = settings?.find(
      (setting: Setting) => setting.name === JiraUserSettings.locale,
    )?.value as string | undefined;

    if (typeof locale === 'string' && this.isSupportedLocale(locale)) {
      this.setLocale(locale);
      return;
    }

    this.setLocale(environment['appLocale'] as string);
  }

  private async ensureLocaleDataLoaded(locale: string): Promise<void> {
    if (this.loadedLocales.has(locale)) {
      return;
    }

    const inFlight: Promise<void> | undefined = this.loadingLocales.get(locale);

    if (inFlight) {
      await inFlight;
      return;
    }

    const loader: (() => Promise<{ default: unknown }>) | undefined = this.localeLoaders[locale];

    if (!loader) {
      return;
    }

    const loadPromise: Promise<void> = loader()
      .then((module: { default: unknown }) => {
        registerLocaleData(module.default, locale);
        this.loadedLocales.add(locale);
      })
      .finally(() => {
        this.loadingLocales.delete(locale);
      });

    this.loadingLocales.set(locale, loadPromise);
    await loadPromise;
  }
}
