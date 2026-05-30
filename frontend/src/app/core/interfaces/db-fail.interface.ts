import { KeyValueEntry } from '@core/types/key-value-entry.type';

export interface DbFailInterface {
  customStoreName?: string;
  data: {
    key?: IDBValidKey;
    value?: unknown;
    dataEntries?: KeyValueEntry[];
  };
}
