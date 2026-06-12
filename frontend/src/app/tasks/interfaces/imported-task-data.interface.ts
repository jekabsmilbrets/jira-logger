import { ApiTag } from '@shared/interfaces/api/api-tag.interface';
import { ApiTask } from '@shared/interfaces/api/api-task.interface';
import { ApiTimeLog } from '@shared/interfaces/api/api-time-log.interface';

export interface TagInterfaceObjectData {
  id?: ApiTag['id'];
  _id?: ApiTag['id'];
  name?: ApiTag['name'];
  _name?: ApiTag['name'];
}

export type TagInterfaceData = string | TagInterfaceObjectData | null | undefined;

export interface TimeLogInterfaceData {
  _startTime?: ApiTimeLog['startTime'];
  _endTime?: ApiTimeLog['endTime'];
  _description?: ApiTimeLog['description'];
}

export type TimeLogsInterfaceData = TimeLogInterfaceData[];
export type TagsInterfaceData = TagInterfaceData[];

export interface TaskInterfaceData {
  _name?: ApiTask['name'];
  _description?: ApiTask['description'];
  _timeLogs?: TimeLogsInterfaceData | null;
  _tags?: TagsInterfaceData | null;
}

export type TasksInterfaceData = TaskInterfaceData[];
