export interface DbFailInterface {
  customStoreName?: string;
  data: {
    key?: IDBValidKey;
    value?: unknown;
    dataEntries?: [IDBValidKey, unknown][];
  };
}
