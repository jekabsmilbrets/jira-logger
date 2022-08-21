export const getNestedObject = (
  nestedObj: any,
  pathArr: Array<string>,
): any =>
  pathArr.reduce(
    (obj, key) =>
      (
        obj && obj[key] !== 'undefined'
      ) ? obj[key] : undefined, nestedObj,
  );
