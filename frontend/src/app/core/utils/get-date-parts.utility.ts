export const getDateParts: (date: Date) => number[] = (
  date: Date,
): number[] => {
  const dateYear: number = date.getFullYear();
  const dateMonth: number = date.getMonth();
  const dateDate: number = date.getDate();

  return [
    dateYear,
    dateMonth,
    dateDate,
  ];
};
