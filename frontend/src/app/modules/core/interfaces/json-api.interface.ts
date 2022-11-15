export interface JsonApi<DataGeneric = any, ErrorsGeneric = any, MetaGeneric = any> {
  data?: DataGeneric;
  errors?: { [key: string]: any } | ErrorsGeneric;
  meta?: { [key: string]: any } | MetaGeneric;
}
