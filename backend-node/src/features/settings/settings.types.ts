import type { SettingsRepository } from '../../settings.repository.js';

export type SettingsStore = Pick<SettingsRepository, 'list' | 'find' | 'value' | 'jiraConfiguration' | 'save' | 'delete'>;
