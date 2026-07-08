import { HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';

import { map, type Observable } from 'rxjs';

import { TimezoneService } from '@core/services/timezone.service';
import { formatDateInTimezone } from '@core/utilities/format-date-in-timezone.utility';

import { adaptTasks } from '@shared/adapters/task.adapter';
import type { ApiTask } from '@shared/interfaces/api/api-task.interface';
import type { ResourceRequestHandle } from '@shared/interfaces/resource-request-handle.interface';
import type { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Task } from '@shared/models/task.model';
import { ApiRequestService } from '@shared/services/api-request.service';
import type { QueryParams } from '@shared/types/query-params.type';

type QueryParamKey = keyof QueryParams;
type QueryParamEntry = readonly [QueryParamKey, string | undefined];

const queryParamBuilders: [QueryParamKey, (filter: TaskListFilter, formatDateForQuery: (date: Date) => string) => string | undefined][] = [
  ['hideUnreported', (filter: TaskListFilter) => filter.hideUnreported ? String(filter.hideUnreported) : undefined],
  ['date', (filter: TaskListFilter, formatDateForQuery: (date: Date) => string) => filter.date ? formatDateForQuery(filter.date) : undefined],
  ['startDate', (filter: TaskListFilter, formatDateForQuery: (date: Date) => string) => filter.startDate ? formatDateForQuery(filter.startDate) : undefined],
  ['endDate', (filter: TaskListFilter, formatDateForQuery: (date: Date) => string) => filter.endDate ? formatDateForQuery(filter.endDate) : undefined],
  ['tags', (filter: TaskListFilter) => filter.tags ? filter.tags.join(',') : undefined],
  ['name', (filter: TaskListFilter) => filter.name],
];

@Service()
export class TaskQueryService {
  private readonly apiRequestService: ApiRequestService = inject(ApiRequestService);
  private readonly taskResource: ResourceRequestHandle = this.apiRequestService.resource('task');
  private readonly timezoneService: TimezoneService = inject(TimezoneService);

  public query(
    filter: TaskListFilter,
  ): Observable<Task[]> {
    return this.taskResource.listRequest<ApiTask>(this.buildQueryUrl(filter))
      .pipe(
        map((tasks: ApiTask[]) => adaptTasks(tasks)),
      );
  }

  private buildQueryUrl(
    filter: TaskListFilter,
  ): string {
    const queryParams: QueryParams = this.buildQueryParams(filter);

    return Object.keys(queryParams).length > 0 ?
      '?' + new HttpParams({ fromObject: queryParams }).toString() :
      '';
  }

  private buildQueryParams(
    filter: TaskListFilter,
  ): QueryParams {
    return Object.fromEntries(
      queryParamBuilders
        .map(
          ([key, buildValue]) => [
            key,
            buildValue(
              filter,
              (date: Date) => formatDateInTimezone(date, 'yyyy-MM-dd', 'en-US', this.timezoneService.timezone),
            ),
          ] as QueryParamEntry,
        )
        .filter((entry: QueryParamEntry) => entry[1] !== undefined) as [QueryParamKey, string][],
    ) as QueryParams;
  }
}
