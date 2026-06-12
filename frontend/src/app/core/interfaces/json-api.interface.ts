export interface JsonApi<DataGeneric = unknown, ErrorsGeneric = unknown, MetaGeneric = unknown> {
  data?: DataGeneric;
  errors?: Record<string, unknown> | ErrorsGeneric;
  meta?: Record<string, unknown> | MetaGeneric;
}
