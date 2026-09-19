import type { TimersRepository } from '@features/timers/timers.repository';


export type TimersStore = Pick<TimersRepository, 'find' | 'forTask' | 'save' | 'delete' | 'stopAll' | 'start' | 'latestRunning' | 'stop' | 'activeTask' | 'overlapping'>;
