export const getNestedObject: (nestedObj: any, pathArr: string[]) => any = (
  nestedObj: any,
  pathArr: string[],
): any => pathArr.reduce(
  (obj, key) => (
    obj && obj[key] !== 'undefined' ?
      obj[key] :
      undefined
  ),
  nestedObj,
);
