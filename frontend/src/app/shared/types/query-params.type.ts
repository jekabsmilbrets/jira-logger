import { QueryParamKey } from '@shared/types/query-param-key.type';

export type QueryParams = Partial<Record<QueryParamKey, string>>;
