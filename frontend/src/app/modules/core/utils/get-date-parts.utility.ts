export const getDateParts = (date: Date): number[] => {
  const dateYear = date.getFullYear();
  const dateMonth = date.getMonth();
  const dateDate = date.getDate();

  return [
    dateYear,
    dateMonth,
    dateDate,
  ];
};
