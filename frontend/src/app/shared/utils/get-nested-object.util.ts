export const getNestedObject: (nestedObj: object, pathArr: string[]) => unknown = (
  nestedObj: object,
  pathArr: string[],
): unknown => pathArr.reduce<unknown>(
  (obj: unknown, key: string) => (
    obj &&
    typeof obj === 'object' &&
    key in obj &&
    (obj as Record<string, unknown>)[key] !== 'undefined' ?
      (obj as Record<string, unknown>)[key] :
      undefined
  ),
  nestedObj,
);
