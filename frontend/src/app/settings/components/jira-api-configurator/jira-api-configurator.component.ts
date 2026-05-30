import { Component, Input, input, InputSignal, OnInit, output, OutputEmitterRef } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { Setting } from '@core/models/setting.model';

import { JiraApiSettings } from '@settings/enums/jira-api-settings.enum';
import { JiraApiFormGroupData } from '@settings/interfaces/jira-api-form-group-data.interface';
import { JiraApiFormGroup } from '@settings/interfaces/jira-api-form-group.interface';

@Component({
  selector: 'settings-jira-api-configurator',
  templateUrl: './jira-api-configurator.component.html',
  styleUrls: ['./jira-api-configurator.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
})
export class JiraApiConfiguratorComponent implements OnInit {
  public readonly settings: InputSignal<Setting[]> = input<Setting[]>([]);

  protected readonly settingsChange: OutputEmitterRef<Setting[]> = output<Setting[]>();

  protected formGroup: FormGroup<JiraApiFormGroup> = new FormGroup<JiraApiFormGroup>({
    [JiraApiSettings.enabled]: new FormControl(false, Validators.required),
    [JiraApiSettings.host]: new FormControl('', Validators.required),
    [JiraApiSettings.personalAccessToken]: new FormControl(''),
  });
  protected hidePersonalAccessToken: boolean = true;
  protected hasStoredPersonalAccessToken: boolean = false;

  // TODO: Skipped for migration because:
  //  Accessor inputs cannot be migrated as they are too complex.
  @Input()
  public set disabled(disabled: boolean | null) {
    if (disabled) {
      this.formGroup.disable();
    } else {
      this.formGroup.enable();
    }
  }

  public ngOnInit(): void {
    this.patchFormData();
    this.formGroup.controls[JiraApiSettings.enabled].valueChanges.subscribe(() => this.updateTokenValidator());
  }

  protected onCancel(): void {
    this.patchFormData();
  }

  protected onSaveFormData(): void {
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const formData: JiraApiFormGroupData = this.formGroup.getRawValue() as JiraApiFormGroupData;
    const changedSettings: Setting[] = [];

    for (const setting of Object.entries(formData)) {
      const [key, value] = setting as [JiraApiSettings, string | boolean | null];

      if (this.getSettingValue(key, false) !== value) {
        const originalSetting: undefined | Setting = this.getSetting(key);

        if (originalSetting) {
          if (key === JiraApiSettings.personalAccessToken) {
            if (typeof value !== 'string') {
              continue;
            }

            if (!value.trim()) {
              if (this.formGroup.controls[JiraApiSettings.enabled].value === false && this.hasStoredPersonalAccessToken) {
                changedSettings.push(
                  new Setting({
                    ...originalSetting,
                    value: '',
                  }),
                );
              }
              continue;
            }
          }

          changedSettings.push(
            new Setting({
              ...originalSetting,
              value,
            }),
          );
        }
      }
    }

    if (changedSettings.length > 0) {
      this.settingsChange.emit(changedSettings);
    }
  }

  private patchFormData(): void {
    this.hasStoredPersonalAccessToken = !!this.getSettingValue(JiraApiSettings.personalAccessToken, '');
    const newFormData: Record<string, string | boolean> = {
      [`${ JiraApiSettings.enabled }`]: this.getSettingValue(JiraApiSettings.enabled, false),
      [`${ JiraApiSettings.host }`]: this.getSettingValue(JiraApiSettings.host, ''),
      [`${ JiraApiSettings.personalAccessToken }`]: '',
    };

    this.formGroup.patchValue(newFormData);
    this.formGroup.controls[JiraApiSettings.personalAccessToken].markAsPristine();
    this.updateTokenValidator();
  }

  private updateTokenValidator(): void {
    const tokenControl: FormControl<string | null> = this.formGroup.controls[JiraApiSettings.personalAccessToken];
    const jiraEnabled: boolean = !!this.formGroup.controls[JiraApiSettings.enabled].value;
    const requireToken: boolean = jiraEnabled && !this.hasStoredPersonalAccessToken;

    tokenControl.clearValidators();
    if (requireToken) {
      tokenControl.setValidators(Validators.required);
    }
    tokenControl.updateValueAndValidity({ emitEvent: false });
  }

  private getSetting(
    name: JiraApiSettings,
  ): Setting | undefined {
    const settings: Setting[] = this.settings();

    if (Array.isArray(settings)) {
      return settings.find(
        (s: Setting) => s.name === name,
      );
    }

    return undefined;
  }

  private getSettingValue(
    name: JiraApiSettings,
    defaultValue: string | boolean,
  ): string | boolean {
    const settings: Setting[] = this.settings();

    if (Array.isArray(settings)) {
      const setting: undefined | Setting = settings.find(
        (s: Setting) => s.name === name,
      );

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
