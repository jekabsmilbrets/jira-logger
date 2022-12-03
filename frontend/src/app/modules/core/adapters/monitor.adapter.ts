import { ApiMonitor } from '@core/interfaces/api/monitor.interface';
import { Monitor }    from '@core/models/monitor.model';


export const adaptMonitor = (apiMonitor: ApiMonitor): Monitor => new Monitor(
  {
    time: new Date(apiMonitor.time),
    message: apiMonitor.message,
  },
);
