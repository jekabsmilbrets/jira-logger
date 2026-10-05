import type { TimersRepository } from '@features/timers/timers.repository';


export type TimersStore = Pick<TimersRepository, 'find' | 'forTask' | 'save' | 'delete' | 'changeRunning' | 'activeTask' | 'totalSeconds' | 'jiraSummary'>;

export interface JiraTimerSummary {
  seconds: number;
  comment: string;
}
