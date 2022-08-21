import { getNestedObject } from '@shared/utils/get-nested-object.util';

export const columnValue = (
  element: any,
  column: string,
  join?: boolean,
  joinCallback?: CallableFunction,
): any => {
  element = Object(element);

  if (true === join) {
    if (joinCallback) {
      return element.hasOwnProperty(column) ? element[column].map(joinCallback).join(', ') : '';
    }
    return element.hasOwnProperty(column) ? element[column].join(', ') : '';
  }

  return getNestedObject(element, column.split('.')) ?? '';
};
