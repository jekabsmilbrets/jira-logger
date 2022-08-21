export interface DbFailInterface {
  customStoreName?: string;
  data: {
    key?: IDBValidKey;
    value?: any;
    dataEntries?: [IDBValidKey, any][];
  };
}
