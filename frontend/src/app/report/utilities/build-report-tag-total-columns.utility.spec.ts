import { Tag } from '@shared/models/tag.model';
import { Task } from '@shared/models/task.model';

import { buildReportTagTotalColumns } from './build-report-tag-total-columns.utility';

describe('Report Utilities build-report-tag-total-columns.utility', () => {
  const backendTag = new Tag({ id: 'tag-1', name: 'Backend' });
  const frontendTag = new Tag({ id: 'tag-2', name: 'Frontend' });
  const opsTag = new Tag({ id: 'tag-3', name: 'Ops' });

  it('does not create columns for zero or one selected tag', () => {
    expect(buildReportTagTotalColumns(
      [],
      () => 60,
    )).toEqual([]);
    expect(buildReportTagTotalColumns(
      [backendTag],
      () => 60,
    )).toEqual([]);
  });

  it('creates readable time columns for two or more selected tags', () => {
    const columns = buildReportTagTotalColumns(
      [
        backendTag,
        frontendTag,
      ],
      () => 60,
    );

    expect(columns.map((column) => column.columnDef)).toEqual([
      'tagTotal_tag-1',
      'tagTotal_tag-2',
    ]);
    expect(columns.map((column) => column.header)).toEqual([
      'Backend',
      'Frontend',
    ]);
    expect(columns.every((column) => column.pipe === 'readableTime')).toBe(true);
    expect(columns.every((column) => column.cellClickType === 'readableTime')).toBe(true);
    expect(columns.every((column) => column.footerCellClickType === 'readableTime')).toBe(true);
  });

  it('falls back to normalized tag names and indexes when tag id is missing', () => {
    const columns = buildReportTagTotalColumns(
      [
        new Tag({ name: 'Needs Review!' }),
        new Tag({ name: 'Needs Review!' }),
      ],
      () => 60,
    );

    expect(columns.map((column) => column.columnDef)).toEqual([
      'tagTotal_needs-review_0',
      'tagTotal_needs-review_1',
    ]);
  });

  it('computes row and footer values for matching tags without mutating total logic', () => {
    const backendOnlyTask = new Task({
      tags: [backendTag],
    } as Partial<Task>);
    const multiTagTask = new Task({
      tags: [
        backendTag,
        frontendTag,
      ],
    } as Partial<Task>);
    const zeroValueTask = new Task({
      tags: [opsTag],
    } as Partial<Task>);
    const columns = buildReportTagTotalColumns(
      [
        backendTag,
        frontendTag,
        opsTag,
      ],
      (task: Task) => task === zeroValueTask ?
        0 :
        60,
    );
    const [backendColumn, frontendColumn, opsColumn] = columns;

    expect(backendColumn.cell(backendOnlyTask)).toBe(60);
    expect(backendColumn.cell(multiTagTask)).toBe(60);
    expect(frontendColumn.cell(multiTagTask)).toBe(60);
    expect(frontendColumn.cell(backendOnlyTask)).toBe(0);
    expect(opsColumn.cell(zeroValueTask)).toBe(0);
    expect(backendColumn.footerCell?.([
      backendOnlyTask,
      multiTagTask,
      zeroValueTask,
    ])).toBe(120);
    expect(frontendColumn.footerCell?.([
      backendOnlyTask,
      multiTagTask,
      zeroValueTask,
    ])).toBe(60);
    expect(opsColumn.footerCell?.([
      backendOnlyTask,
      multiTagTask,
      zeroValueTask,
    ])).toBe(0);
  });
});
