import { effect, EffectRef, inject, Service } from '@angular/core';
import { DateAdapter } from '@angular/material/core';

import { environment } from '@environments/environment';

import { Locale } from './locale';

@Service()
export class MaterialLocaleBridge {
  private readonly dateAdapter: DateAdapter<Date> = inject(DateAdapter<Date>);
  private readonly localeService: Locale = inject(Locale);

  private activeLocale: string = environment['appLocale'] as string;

  private readonly syncLocaleEffect: EffectRef = effect(() => {
    const locale: string = this.localeService.localeSignal();

    if (locale === this.activeLocale) {
      return;
    }

    this.activeLocale = locale;
    this.dateAdapter.setLocale(locale);
  });

  constructor() {
    this.dateAdapter.setLocale(this.activeLocale);
  }
}
