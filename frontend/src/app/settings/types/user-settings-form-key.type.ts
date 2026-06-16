import { USER_SETTINGS_FORM_KEYS } from '@settings/utilities/settings-form-mapping.utility';

export type UserSettingsFormKey = typeof USER_SETTINGS_FORM_KEYS[keyof typeof USER_SETTINGS_FORM_KEYS];
