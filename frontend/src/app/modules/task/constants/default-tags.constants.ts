import { TaskTagsEnum } from '@task/enums/task-tags.enum';

export const defaultTaskFilterTags: TaskTagsEnum[] = [
  TaskTagsEnum.capex,
  TaskTagsEnum.opex,
  TaskTagsEnum.other,
];

export const defaultSelectTags: { viewValue: string; value: TaskTagsEnum }[] = [
  {
    value: TaskTagsEnum.opex,
    viewValue: 'OPEX',
  },
  {
    value: TaskTagsEnum.capex,
    viewValue: 'CAPEX',
  },
  {
    value: TaskTagsEnum.other,
    viewValue: 'OTHER',
  },
];
