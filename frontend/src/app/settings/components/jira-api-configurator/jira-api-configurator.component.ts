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

    this.emitChangedSettings(this.collectChangedSettings(this.jiraApiFormModel()));
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
  protected readonly hasHostError: () => boolean = () => this.jiraApiForm.host().touched() && this.jiraApiForm.host().invalid();
  protected readonly showStoredTokenHint: () => boolean = () => this.hasStoredPersonalAccessToken();
  protected readonly showTokenRequiredError: () => boolean = () => this.jiraApiForm.personalAccessToken().touched() && this.isTokenRequired();

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
    const setting: Setting | undefined = this.getSetting(name);

    return this.normalizeSettingValue(setting?.value, defaultValue);
  }

  private collectChangedSettings(
    formData: JiraApiFormValue,
  ): Setting[] {
    return this.getSettingEntries(formData)
      .map(([name, value]: [JiraApiSettings, string | boolean]) => this.buildChangedSetting(name, value))
      .filter((setting): setting is Setting => setting !== undefined);
  }

  private getSettingEntries(
    formData: JiraApiFormValue,
  ): [JiraApiSettings, string | boolean][] {
    return [
      [JiraApiSettings.enabled, formData.enabled],
      [JiraApiSettings.host, formData.host],
      [JiraApiSettings.personalAccessToken, formData.personalAccessToken],
    ];
  }

  private buildChangedSetting(
    name: JiraApiSettings,
    value: string | boolean,
  ): Setting | undefined {
    const originalSetting: Setting | undefined = this.getSetting(name);

    if (!originalSetting || this.getSettingValue(name, false) === value || !this.shouldPersistSetting(name, value)) {
      return undefined;
    }

    return new Setting({
      ...originalSetting,
      value: this.stringifySettingValue(value),
    });
  }

  private shouldPersistSetting(
    name: JiraApiSettings,
    value: string | boolean,
  ): boolean {
    return name !== JiraApiSettings.personalAccessToken ||
      (typeof value === 'string' && value.trim().length > 0);
  }

  private stringifySettingValue(
    value: string | boolean,
  ): string {
    return typeof value === 'boolean' ?
      String(value) :
      value ?? '';
  }

  private normalizeSettingValue(
    value: unknown,
    defaultValue: string | boolean,
  ): string | boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value !== 'string') {
      return defaultValue;
    }

    const normalizedBoolean: boolean | undefined = this.normalizeBooleanLikeValue(value);

    return normalizedBoolean ?? value;
  }

  private normalizeBooleanLikeValue(
    value: string,
  ): boolean | undefined {
    const normalizedValue: string = value.toLowerCase();

    if (normalizedValue === 'true') {
      return true;
    }

    if (normalizedValue === 'false') {
      return false;
    }

    return undefined;
  }

  private emitChangedSettings(
    changedSettings: Setting[],
  ): void {
    if (changedSettings.length === 0) {
      return;
    }

    this.settingsChange.emit({
      changedSettings,
      successMessage: 'Successfully saved JIRA API settings!',
    });
  }
}
