export interface TimezoneProvider {
  userTimezone(): Promise<string>;
}
