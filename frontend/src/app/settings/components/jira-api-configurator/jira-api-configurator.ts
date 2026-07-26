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
import { disabled, type FieldTree, form, FormField, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { Setting } from '@core/models/setting.model';

import { JiraApiSettingsAdapter } from '@settings/adapters/jira-api-settings.adapter';
import type { JiraApiFormValue } from '@settings/interfaces/jira-api-form-value.interface';
import type { SettingsSaveEvent } from '@settings/interfaces/settings-save-event.interface';

@Component({
  selector: 'settings-jira-api-configurator',
  templateUrl: './jira-api-configurator.html',
  styleUrls: ['./jira-api-configurator.scss'],
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
export class JiraApiConfigurator {
  private readonly jiraApiSettingsAdapter: JiraApiSettingsAdapter = inject(JiraApiSettingsAdapter);

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

  protected togglePersonalAccessTokenVisibility(): void {
    this.hidePersonalAccessToken.set(!this.hidePersonalAccessToken());
  }

  protected getPersonalAccessTokenInputType(): 'password' | 'text' {
    return this.hidePersonalAccessToken() ?
      'password' :
      'text';
  }

  protected getPersonalAccessTokenVisibilityLabel(): string {
    return this.hidePersonalAccessToken() ?
      'Show token' :
      'Hide token';
  }

  protected getPersonalAccessTokenVisibilityIcon(): string {
    return this.hidePersonalAccessToken() ?
      'visibility_off' :
      'visibility';
  }

  protected isSaveDisabled(): boolean {
    return this.jiraApiForm().disabled() || !this.jiraApiForm().dirty() || this.jiraApiForm().invalid();
  }

  private resetFormData(): void {
    this.hasStoredPersonalAccessToken.set(this.jiraApiSettingsAdapter.hasStoredPersonalAccessToken(this.settings()));
    this.jiraApiForm().reset(this.jiraApiSettingsAdapter.toFormValue(this.settings()));
    this.hidePersonalAccessToken.set(true);
  }

  protected readonly isTokenRequired: () => boolean = () => this.jiraApiForm.personalAccessToken().getError('required') !== undefined;
  protected readonly hasHostError: () => boolean = () => this.jiraApiForm.host().touched() && this.jiraApiForm.host().invalid();
  protected readonly showStoredTokenHint: () => boolean = () => this.hasStoredPersonalAccessToken();
  protected readonly showTokenRequiredError: () => boolean = () => this.jiraApiForm.personalAccessToken().touched() && this.isTokenRequired();

  private collectChangedSettings(
    formData: JiraApiFormValue,
  ): Setting[] {
    return this.jiraApiSettingsAdapter.changedSettings(this.settings(), formData);
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
