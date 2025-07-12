export interface JsonApi<DataGeneric = any, ErrorsGeneric = any, MetaGeneric = any> {
  data?: DataGeneric;
  errors?: Record<string, any> | ErrorsGeneric;
  meta?: Record<string, any> | MetaGeneric;
}
