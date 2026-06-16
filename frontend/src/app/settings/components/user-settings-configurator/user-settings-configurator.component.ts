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

import { JiraUserSettings } from '@settings/enums/jira-user-settings.enum';
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
  private readonly localeService: LocaleService = inject(LocaleService);

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

    const changedSettings: Setting[] = [];
    const formData: UserSettingsFormValue = this.userSettingsFormModel();

    const timezoneValue: string = formData.timezone;
    const originalTimezoneSetting: Setting | undefined = this.getSetting(JiraUserSettings.userTimeZone);
    if (
      originalTimezoneSetting &&
      this.getSettingValue(JiraUserSettings.userTimeZone, '') !== timezoneValue
    ) {
      changedSettings.push(
        new Setting({
          ...originalTimezoneSetting,
          value: timezoneValue,
        }),
      );
    }

    const localeValue: string = formData.locale;
    const originalLocaleSetting: Setting | undefined = this.getSetting(JiraUserSettings.locale);
    if (
      originalLocaleSetting &&
      this.getSettingValue(JiraUserSettings.locale, '') !== localeValue
    ) {
      changedSettings.push(
        new Setting({
          ...originalLocaleSetting,
          value: localeValue,
        }),
      );
    }

    if (changedSettings.length > 0) {
      this.settingsChange.emit({
        changedSettings,
        successMessage: 'Successfully saved user preferences!',
      });
    }
  }

  private resetFormData(): void {
    const configuredTimezone: string = String(this.getSettingValue(JiraUserSettings.userTimeZone, ''));

    if (configuredTimezone && !this.timezones.includes(configuredTimezone)) {
      this.timezones = [
        configuredTimezone,
        ...this.timezones,
      ];
    }

    this.userSettingsForm().reset({
      timezone: configuredTimezone,
      locale: this.getSettingValue(JiraUserSettings.locale, 'lv-LV'),
    });
  }

  private getSetting(name: JiraUserSettings): Setting | undefined {
    const settings: Setting[] = this.settings();

    if (Array.isArray(settings)) {
      return settings.find((s: Setting) => s.name === name);
    }

    return undefined;
  }

  private getSettingValue(
    name: JiraUserSettings,
    defaultValue: string,
  ): string {
    const settings: Setting[] = this.settings();

    if (Array.isArray(settings)) {
      const setting: undefined | Setting = settings.find((s: Setting) => s.name === name);

      if (setting && typeof setting.value === 'string') {
        return setting.value;
      }
    }

    return defaultValue;
  }

  private getSupportedTimezones(): string[] {
    const fallback: string[] = [
      'UTC',
      'Europe/Riga',
      'Europe/London',
      'Europe/Berlin',
      'Europe/Vienna',
    ];

    if (
      typeof Intl !== 'undefined' &&
      'supportedValuesOf' in Intl &&
      typeof Intl.supportedValuesOf === 'function'
    ) {
      try {
        return Intl.supportedValuesOf('timeZone')
          .filter((timezone: string) => typeof timezone === 'string' && timezone.length > 0)
          .sort((a: string, b: string) => a.localeCompare(b));
      } catch {
        return fallback;
      }
    }

    return fallback;
  }
}
