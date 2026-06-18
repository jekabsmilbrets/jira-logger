import type { JoinCallback } from '@shared/types/join-callback.type';
import { getNestedObject } from '@shared/utilities/get-nested-object.utility';

export const columnValue: (element: object, column: string, join?: boolean, joinCallback?: JoinCallback) => unknown = (
  element: object,
  column: string,
  join?: boolean,
  joinCallback?: JoinCallback,
): unknown => {
  const safeElement: Record<string, unknown> = Object(element);

  if (join === true) {
    if (!Object.prototype.hasOwnProperty.call(safeElement, column)) {
      return '';
    }

    const value: unknown = safeElement[column];

    if (!Array.isArray(value)) {
      return '';
    }

    return joinCallback ?
      value.map(joinCallback).join(', ') :
      value.join(', ');
  }

  return getNestedObject(safeElement, column.split('.')) ?? '';
};
