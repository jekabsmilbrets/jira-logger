import { ChangeDetectionStrategy, Component, effect, inject, input, InputSignal, OnInit, output, OutputEmitterRef } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { LocaleOption } from '@core/interfaces/locale-option.interface';
import { Setting } from '@core/models/setting.model';
import { LocaleService } from '@core/services/locale.service';

import { JiraUserSettings, JiraUserSettingSlugs } from '@settings/enums/jira-user-settings.enum';
import { TimeZoneFormGroup } from '@settings/interfaces/time-zone-form-group.interface';

@Component({
  selector: 'settings-timezone-configurator',
  templateUrl: './user-settings-configurator.component.html',
  styleUrls: ['./user-settings-configurator.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
  ],
})
export class UserSettingsConfiguratorComponent implements OnInit {
  private readonly localeService: LocaleService = inject(LocaleService);

  public readonly settings: InputSignal<Setting[]> = input<Setting[]>([]);
  public readonly disabled: InputSignal<boolean | null | undefined> = input<boolean | null>();

  protected readonly settingsChange: OutputEmitterRef<Setting[]> = output<Setting[]>();

  protected formGroup = new FormGroup<TimeZoneFormGroup>({
    [JiraUserSettingSlugs.userTimeZone]: new FormControl<string | null>(''),
    [JiraUserSettingSlugs.locale]: new FormControl<string | null>(''),
  });
  protected timezones: string[] = this.getSupportedTimezones();
  protected readonly locales: LocaleOption[] = this.localeService.localeOptions;

  constructor() {
    effect(() => {
      if (this.disabled()) {
        this.formGroup.disable();
      } else {
        this.formGroup.enable();
      }
    });
  }

  public ngOnInit(): void {
    this.patchFormData();
  }

  protected onCancel(): void {
    this.patchFormData();
  }

  protected onSaveFormData(): void {
    const changedSettings: Setting[] = [];

    const timezoneValue: string = this.formGroup.controls[JiraUserSettingSlugs.userTimeZone].value ?? '';
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

    const localeValue: string = this.formGroup.controls[JiraUserSettingSlugs.locale].value ?? '';
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
      this.settingsChange.emit(changedSettings);
    }
  }

  private patchFormData(): void {
    const configuredTimezone: string = String(this.getSettingValue(JiraUserSettings.userTimeZone, ''));

    if (configuredTimezone && !this.timezones.includes(configuredTimezone)) {
      this.timezones = [
        configuredTimezone,
        ...this.timezones,
      ];
    }

    this.formGroup.patchValue({
      [JiraUserSettingSlugs.userTimeZone]: configuredTimezone,
      [JiraUserSettingSlugs.locale]: this.getSettingValue(JiraUserSettings.locale, 'lv-LV'),
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
