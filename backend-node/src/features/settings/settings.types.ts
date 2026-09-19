import type { SettingsRepository } from '@features/settings/settings.repository';


export type SettingsStore = Pick<SettingsRepository, 'list' | 'find' | 'value' | 'jiraConfiguration' | 'save' | 'delete'>;
