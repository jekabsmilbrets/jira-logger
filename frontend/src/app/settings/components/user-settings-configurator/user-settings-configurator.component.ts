import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  signal,
  WritableSignal,
} from '@angular/core';
import { disabled, type FieldTree, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import type { LocaleOption } from '@core/interfaces/locale-option.interface';
import { Setting } from '@core/models/setting.model';
import { LocaleService } from '@core/services/locale.service';

import { UserPreferencesAdapter } from '@settings/adapters/user-preferences.adapter';
import type { SettingsSaveEvent } from '@settings/interfaces/settings-save-event.interface';
import type { UserSettingsFormValue } from '@settings/interfaces/user-settings-form-value.interface';

@Component({
  selector: 'settings-timezone-configurator',
  templateUrl: './user-settings-configurator.component.html',
  styleUrls: ['./user-settings-configurator.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
  ],
})
export class UserSettingsConfiguratorComponent {
  private static readonly timezoneFallback: string[] = [
    'UTC',
    'Europe/Riga',
    'Europe/London',
    'Europe/Berlin',
    'Europe/Vienna',
  ];

  private readonly localeService: LocaleService = inject(LocaleService);
  private readonly userPreferencesAdapter: UserPreferencesAdapter = inject(UserPreferencesAdapter);

  public readonly settings: InputSignal<Setting[]> = input<Setting[]>([]);
  public readonly disabled: InputSignal<boolean | null | undefined> = input<boolean | null>();

  protected readonly settingsChange: OutputEmitterRef<SettingsSaveEvent> = output<SettingsSaveEvent>();
  protected readonly userSettingsFormModel: WritableSignal<UserSettingsFormValue> = signal({
    locale: 'lv-LV',
    timezone: '',
  });
  protected readonly userSettingsForm: FieldTree<UserSettingsFormValue> = form(this.userSettingsFormModel, (path) => {
    disabled(path, () => !!this.disabled());
  });
  protected timezones: string[] = this.getSupportedTimezones();
  protected readonly locales: LocaleOption[] = this.localeService.localeOptions;

  constructor() {
    effect(() => {
      this.resetFormData();
    });
  }

  protected onCancel(): void {
    this.resetFormData();
  }

  protected onTimezoneChange(timezone: string): void {
    const field: ReturnType<typeof this.userSettingsForm.timezone> = this.userSettingsForm.timezone();
    field.value.set(timezone);
    field.markAsDirty();
    field.markAsTouched({ skipDescendants: true });
  }

  protected onLocaleChange(locale: string): void {
    const field: ReturnType<typeof this.userSettingsForm.locale> = this.userSettingsForm.locale();
    field.value.set(locale);
    field.markAsDirty();
    field.markAsTouched({ skipDescendants: true });
  }

  protected onSaveFormData(event?: Event): void {
    event?.preventDefault?.();

    const formData: UserSettingsFormValue = this.userSettingsFormModel();
    const changedSettings: Setting[] = this.userPreferencesAdapter.changedSettings(this.settings(), formData);

    if (changedSettings.length > 0) {
      this.settingsChange.emit({
        changedSettings,
        successMessage: 'Successfully saved user preferences!',
      });
    }
  }

  private resetFormData(): void {
    const formValue: UserSettingsFormValue = this.userPreferencesAdapter.toFormValue(this.settings());

    if (formValue.timezone && !this.timezones.includes(formValue.timezone)) {
      this.timezones = [
        formValue.timezone,
        ...this.timezones,
      ];
    }

    this.userSettingsForm().reset(formValue);
  }

  private getSupportedTimezones(): string[] {
    if (typeof Intl.supportedValuesOf !== 'function') {
      return UserSettingsConfiguratorComponent.timezoneFallback;
    }

    try {
      return Intl.supportedValuesOf('timeZone')
        .filter((timezone: string) => timezone.length > 0)
        .sort((a: string, b: string) => a.localeCompare(b));
    } catch {
      return UserSettingsConfiguratorComponent.timezoneFallback;
    }
  }
}
