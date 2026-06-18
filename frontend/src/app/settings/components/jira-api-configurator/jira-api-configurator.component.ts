import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  InputSignal,
  output,
  OutputEmitterRef,
  signal,
  WritableSignal,
} from '@angular/core';
import { disabled, type FieldTree, form, FormField, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { Setting } from '@core/models/setting.model';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import type { JiraApiFormValue } from '@settings/interfaces/jira-api-form-value.interface';
import type { SettingsSaveEvent } from '@settings/interfaces/settings-save-event.interface';
import { findSettingByName } from '@settings/utilities/find-setting-by-name.utility';

@Component({
  selector: 'settings-jira-api-configurator',
  templateUrl: './jira-api-configurator.component.html',
  styleUrls: ['./jira-api-configurator.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    FormField,
  ],
})
export class JiraApiConfiguratorComponent {
  public readonly settings: InputSignal<Setting[]> = input<Setting[]>([]);
  public readonly disabled: InputSignal<boolean | null | undefined> = input<boolean | null>();

  protected readonly settingsChange: OutputEmitterRef<SettingsSaveEvent> = output<SettingsSaveEvent>();
  protected readonly jiraApiFormModel: WritableSignal<JiraApiFormValue> = signal({
    enabled: false,
    host: '',
    personalAccessToken: '',
  });
  protected readonly hidePersonalAccessToken: WritableSignal<boolean> = signal(true);
  protected readonly hasStoredPersonalAccessToken: WritableSignal<boolean> = signal(false);
  protected readonly jiraApiForm: FieldTree<JiraApiFormValue> = form(this.jiraApiFormModel, (path) => {
    required(path.host, { message: 'Host is required.' });
    required(path.personalAccessToken, {
      message: 'Token is required.',
      when: ({ valueOf }) => valueOf(path.enabled) && !this.hasStoredPersonalAccessToken(),
    });
    disabled(path, () => !!this.disabled());
  });

  constructor() {
    effect(() => {
      this.resetFormData();
    });
  }

  protected onCancel(): void {
    this.resetFormData();
  }

  protected onEnabledChange(enabled: boolean): void {
    const field: ReturnType<typeof this.jiraApiForm.enabled> = this.jiraApiForm.enabled();
    field.value.set(enabled);
    field.markAsDirty();
    field.markAsTouched({ skipDescendants: true });
  }

  protected onSaveFormData(event?: Event): void {
    event?.preventDefault?.();

    if (this.jiraApiForm().invalid()) {
      this.jiraApiForm().markAsTouched();
      return;
    }

    const formData: JiraApiFormValue = this.jiraApiFormModel();
    const changedSettings: Setting[] = [];

    for (const setting of Object.entries({
      [JiraApiSettings.enabled]: formData.enabled,
      [JiraApiSettings.host]: formData.host,
      [JiraApiSettings.personalAccessToken]: formData.personalAccessToken,
    })) {
      const [key, value] = setting as [JiraApiSettings, string | boolean];

      if (this.getSettingValue(key, false) !== value) {
        const originalSetting: undefined | Setting = this.getSetting(key);

        if (originalSetting) {
          if (key === JiraApiSettings.personalAccessToken) {
            if (typeof value !== 'string') {
              continue;
            }

            if (!value.trim()) {
              continue;
            }
          }

          changedSettings.push(
            new Setting({
              ...originalSetting,
              value: typeof value === 'boolean' ?
                String(value) :
                value ?? '',
            }),
          );
        }
      }
    }

    if (changedSettings.length > 0) {
      this.settingsChange.emit({
        changedSettings,
        successMessage: 'Successfully saved JIRA API settings!',
      });
    }
  }

  private resetFormData(): void {
    this.hasStoredPersonalAccessToken.set(!!this.getSettingValue(JiraApiSettings.personalAccessToken, ''));
    this.jiraApiForm().reset({
      enabled: this.getSettingValue(JiraApiSettings.enabled, false) as boolean,
      host: String(this.getSettingValue(JiraApiSettings.host, '')),
      personalAccessToken: '',
    });
    this.hidePersonalAccessToken.set(true);
  }

  protected readonly isTokenRequired: () => boolean = () => this.jiraApiForm.personalAccessToken().getError('required') !== undefined;

  private getSetting(
    name: JiraApiSettings,
  ): Setting | undefined {
    const settings: Setting[] = this.settings();

    if (Array.isArray(settings)) {
      return findSettingByName(settings, name);
    }

    return undefined;
  }

  private getSettingValue(
    name: JiraApiSettings,
    defaultValue: string | boolean,
  ): string | boolean {
    const settings: Setting[] = this.settings();

    if (Array.isArray(settings)) {
      const setting: undefined | Setting = findSettingByName(settings, name);

      if (setting) {
        if (
          typeof setting.value === 'string' &&
          ['true', 'false'].includes(setting.value.toLowerCase())
        ) {
          return setting.value.toLowerCase() === 'true';
        }

        if (typeof setting.value === 'string' || typeof setting.value === 'boolean') {
          return setting.value;
        }
      }
    }

    return defaultValue;
  }
}
