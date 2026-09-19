export class ApiError extends Error {
  constructor(public status: number, public errors: string[] | Record<string, string>) { super('API error'); }
}
