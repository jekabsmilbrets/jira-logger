import type { JoinCallback } from '@shared/types/join-callback.type';
import { getNestedObject } from '@shared/utilities/get-nested-object.utility';

export const columnValue: (element: object, column: string, join?: boolean, joinCallback?: JoinCallback) => unknown = (
  element: object,
  column: string,
  join?: boolean,
  joinCallback?: JoinCallback,
): unknown => {
  const safeElement: Record<string, unknown> = Object(element);

  if (true === join) {
    if (joinCallback) {
      if (Object.prototype.hasOwnProperty.call(safeElement, column)) {
        const value: unknown = safeElement[column];

        return Array.isArray(value) ? value.map(joinCallback).join(', ') : '';
      } else {
        return '';
      }
    }
    if (Object.prototype.hasOwnProperty.call(safeElement, column)) {
      const value: unknown = safeElement[column];

      return Array.isArray(value) ? value.join(', ') : '';
    } else {
      return '';
    }
  }

  return getNestedObject(safeElement, column.split('.')) ?? '';
};
