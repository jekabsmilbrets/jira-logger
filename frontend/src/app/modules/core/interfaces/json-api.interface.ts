export interface JsonApi<DataGeneric = void, ErrorsGeneric = void, MetaGeneric = void> {
  data?: DataGeneric;
  errors?: { [key: string]: any } | ErrorsGeneric;
  meta?: { [key: string]: any } | MetaGeneric;
}
