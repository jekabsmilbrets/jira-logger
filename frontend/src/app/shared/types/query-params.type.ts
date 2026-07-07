export type QueryParamKey = 'hideUnreported' | 'date' | 'startDate' | 'endDate' | 'tags' | 'name';

export type QueryParams = Partial<Record<QueryParamKey, string>>;
