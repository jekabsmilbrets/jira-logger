import type { JoinCallback } from '@shared/types/join-callback.type';
import { getNestedObject } from '@shared/utilities/get-nested-object.utility';

const getJoinedColumnValue: (
  value: unknown,
  joinCallback?: JoinCallback,
) => string = (
  value: unknown,
  joinCallback?: JoinCallback,
): string => {
  if (!Array.isArray(value)) {
    return '';
  }

  return joinCallback ?
    value.map(joinCallback).join(', ') :
    value.join(', ');
};

export const columnValue: (element: object, column: string, join?: boolean, joinCallback?: JoinCallback) => unknown = (
  element: object,
  column: string,
  join?: boolean,
  joinCallback?: JoinCallback,
): unknown => {
  const safeElement: Record<string, unknown> = Object(element);
  const joinedValue: unknown = safeElement[column];

  if (join === true) {
    return getJoinedColumnValue(joinedValue, joinCallback);
  }

  return getNestedObject(safeElement, column.split('.')) ?? '';
};
