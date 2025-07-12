import { getNestedObject } from '@shared/utils/get-nested-object.util';

export const columnValue: (element: any, column: string, join?: boolean, joinCallback?: CallableFunction) => any = (
  element: any,
  column: string,
  join?: boolean,
  joinCallback?: CallableFunction,
): any => {
  element = Object(element);

  if (true === join) {
    if (joinCallback) {
      if (Object.prototype.hasOwnProperty.call(element, column)) {
        return element[column].map(joinCallback).join(', ');
      } else {
        return '';
      }
    }
    if (Object.prototype.hasOwnProperty.call(element, column)) {
      return element[column].join(', ');
    } else {
      return '';
    }
  }

  return getNestedObject(element, column.split('.')) ?? '';
};
