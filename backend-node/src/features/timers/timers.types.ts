import type { TimersRepository } from '../../timers.repository.js';

export type TimersStore = Pick<TimersRepository, 'find' | 'forTask' | 'save' | 'delete' | 'stopAll' | 'start' | 'latestRunning' | 'stop' | 'activeTask' | 'overlapping'>;
