import type { Column } from '@shared/interfaces/column.interface';
import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

const normalizeColumnName: (value: string) => string = (value: string): string => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'tag';

const buildTagColumnDef: (
  tag: Tag,
  index: number,
) => string = (
  tag: Tag,
  index: number,
): string => tag.id ?
  `tagTotal_${ tag.id }` :
  `tagTotal_${ normalizeColumnName(tag.name) }_${ index }`;

const taskHasTag: (
  task: Task,
  selectedTag: Tag,
) => boolean = (
  task: Task,
  selectedTag: Tag,
): boolean => task.tags.some(
  (taskTag: Tag) => selectedTag.id ?
    taskTag.id === selectedTag.id :
    taskTag.name === selectedTag.name,
);

export const buildReportTagTotalColumns: (
  selectedTags: Tag[],
  getTaskVisibleTime: (task: Task) => number,
) => Column[] = (
  selectedTags: Tag[],
  getTaskVisibleTime: (task: Task) => number,
): Column[] => {
  if (selectedTags.length < 2) {
    return [];
  }

  return selectedTags.map(
    (tag: Tag, index: number): Column => ({
      columnDef: buildTagColumnDef(
        tag,
        index,
      ),
      header: tag.name,
      sortable: false,
      hidden: false,
      pipe: 'readableTime',
      isClickable: true,
      cellClickType: 'readableTime',
      footerCellClickType: 'readableTime',
      cell: (task: Task) => taskHasTag(
        task,
        tag,
      ) ?
        getTaskVisibleTime(task) :
        0,
      hasFooter: true,
      footerCell: (tasks: Task[]) => tasks
        .map((task: Task) => taskHasTag(
          task,
          tag,
        ) ?
          getTaskVisibleTime(task) :
          0)
        .reduce(
          (acc: number, value: number) => acc + value,
          0,
        ),
    }),
  );
};
