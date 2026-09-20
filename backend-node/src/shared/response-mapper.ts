import type { JiraWorkLogRow, TagRow, TaskRow, TimerRow, Timestamps } from '@database/records.types';

import type { TaskRelations } from '@features/tasks/tasks.types';

import type {
  JiraWorkLogResponse,
  TagResponse,
  TaskResponse,
  TimerResponse,
  TimestampResponse
}                    from '@shared/responses.types';
import { lastTimer } from '@shared/timer.helpers';

import type { DateCodec } from '@time/date-codec';


export class ResponseMapper {
  constructor(
    private readonly dates: DateCodec,
  ) {
  }

  private timestamps(
    row: Timestamps,
    zone: string,
  ): TimestampResponse {
    return {
      id: row.id,
      createdAt: this.dates.atom(row.created_at, zone),
      updatedAt: this.dates.atom(row.updated_at, zone)
    };
  }

  public timer(
    row: TimerRow,
    zone: string,
  ): TimerResponse {
    return {
      ...this.timestamps(row, zone),
      startTime: this.dates.atom(row.start_time, zone),
      endTime: this.dates.atom(row.end_time, zone),
      description: row.description,
      manuallyModified: false,
      originalStartTime: null,
      originalEndTime: null
    };
  }

  public tag(
    row: TagRow,
    zone: string,
  ): TagResponse {
    return {
      ...this.timestamps(row, zone),
      name: row.name,
      isUsed: Boolean(row.is_used)
    };
  }

  public jira(
    row: JiraWorkLogRow,
    zone: string,
  ): JiraWorkLogResponse {
    return {
      ...this.timestamps(row, zone),
      workLogId: row.work_log_id,
      description: row.description,
      timeSpentSeconds: row.time_spent_seconds,
      startTime: this.dates.atom(row.start_time, zone)
    };
  }

  public task(
    row: TaskRow,
    relations: TaskRelations,
    zone: string,
  ): TaskResponse {
    const timers: TimerResponse[] = relations.timers.map(
      (
        timer,
      ) => this.timer(timer, zone,
      ));

    return {
      ...this.timestamps(row, zone),
      name: row.name,
      description: row.description,
      timeLogs: timers,
      tags: relations.tags.map(
        (
          tag,
        ) => this.tag(tag, zone,
        )),
      jiraWorkLogs: relations.logs.map(
        (
          log,
        ) => this.jira(log, zone,
        )),
      lastTimeLog: lastTimer(timers)
    };
  }
}
