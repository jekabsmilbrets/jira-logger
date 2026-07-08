import type { ReportSettingsIntent } from '@report/interfaces/report-settings-intent.interface';
import type { ReportRouteSettings } from '@report/interfaces/report-route-settings.interface';

export type ReportSettingsChange =
  | {
      type: 'settings-intent';
      intent: ReportSettingsIntent;
    }
  | {
      type: 'route-settings';
      routeSettings: ReportRouteSettings;
    };
