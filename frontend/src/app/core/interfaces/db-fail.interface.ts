import type { KeyValueEntry } from '@core/types/key-value-entry.type';

export interface DbFail {
  customStoreName?: string;
  data: {
    key?: IDBValidKey;
    value?: unknown;
    dataEntries?: KeyValueEntry[];
  };
}
