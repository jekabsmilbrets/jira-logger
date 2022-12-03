import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators }             from '@angular/forms';

import { JiraApiSettings }      from '@settings/enums/jira-api-settings.enum';
import { JiraApiFormGroupData } from '@settings/interfaces/jira-api-form-group-data.interface';
import { JiraApiFormGroup }     from '@settings/types/jira-api-form-group.type';

import { Setting } from '@core/models/setting.model';


@Component({
  selector: 'app-jira-api-configurator',
  templateUrl: './jira-api-configurator.component.html',
  styleUrls: ['./jira-api-configurator.component.scss'],
})
export class JiraApiConfiguratorComponent implements OnInit {
  @Input()
  public settings: Setting[] | null = [];
  @Output()
  public settingsChange: EventEmitter<Setting[]> = new EventEmitter<Setting[]>();
  public formGroup: FormGroup<JiraApiFormGroup> = new FormGroup<JiraApiFormGroup>({
    [JiraApiSettings.enabled]: new FormControl(false, Validators.required),
    [JiraApiSettings.host]: new FormControl('', Validators.required),
    [JiraApiSettings.personalAccessToken]: new FormControl('', Validators.required),
  });
  public hidePersonalAccessToken = true;

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
  }

  public onCancel(): void {
    this.patchFormData();
  }

  public onSaveFormData() {
    const formData: JiraApiFormGroupData = this.formGroup.getRawValue() as JiraApiFormGroupData;
    const changedSettings: Setting[] = [];

    for (const setting of Object.entries(formData)) {
      const [key, value] = setting as [JiraApiSettings, string | boolean | null];

      if (this.getSettingValue(key, false) !== value) {
        const originalSetting = this.getSetting(key);

        if (originalSetting) {
          originalSetting.value = value;

          changedSettings.push(
            originalSetting,
          );
        }
      }
    }

    if (changedSettings.length > 0) {
      this.settingsChange.emit(changedSettings);
    }
  }

  private patchFormData(): void {
    const newFormData: { [p: string]: string | boolean } = {
      [`${ JiraApiSettings.enabled }`]: this.getSettingValue(JiraApiSettings.enabled, false),
      [`${ JiraApiSettings.host }`]: this.getSettingValue(JiraApiSettings.host, ''),
      [`${ JiraApiSettings.personalAccessToken }`]: this.getSettingValue(JiraApiSettings.personalAccessToken, ''),
    };

    this.formGroup.patchValue(newFormData);
  }

  private getSetting(
    name: JiraApiSettings,
  ): Setting | undefined {
    if (Array.isArray(this.settings)) {
      return this.settings.find(
        (s: Setting) => s.name === name,
      );
    }

    return undefined;
  }

  private getSettingValue(
    name: JiraApiSettings,
    defaultValue: string | boolean,
  ): string | boolean {
    if (Array.isArray(this.settings)) {
      const setting = this.settings.find(
        (s: Setting) => s.name === name,
      );

      if (setting) {
        if (
          typeof setting.value === 'string' &&
          ['true', 'false'].includes(setting.value.toLowerCase())
        ) {
          return setting.value.toLowerCase() === 'true';
        }

        return setting.value;
      }
    }

    return defaultValue;
  }
}
