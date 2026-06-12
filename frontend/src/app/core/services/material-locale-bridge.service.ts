import { effect, inject, Injectable } from '@angular/core';
import { DateAdapter } from '@angular/material/core';

import { environment } from '@environments/environment';

import { LocaleService } from './locale.service';

@Injectable({
  providedIn: 'root',
})
export class MaterialLocaleBridgeService {
  private readonly dateAdapter: DateAdapter<Date> = inject(DateAdapter<Date>);
  private readonly localeService: LocaleService = inject(LocaleService);

  private activeLocale: string = environment['appLocale'] as string;

  private readonly syncLocaleEffect = effect(() => {
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
