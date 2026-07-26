import { HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';

import { map, type Observable } from 'rxjs';

import { adaptTasks } from '@shared/adapters/task.adapter';
import type { ApiTask } from '@shared/interfaces/api/api-task.interface';
import type { ResourceRequestHandle } from '@shared/interfaces/resource-request-handle.interface';
import type { TaskListFilter } from '@shared/interfaces/task-list-filter.interface';
import { Task } from '@shared/models/task.model';
import { ApiRequest } from '@shared/services/api-request';
import type { QueryParams } from '@shared/types/query-params.type';

type QueryParamKey = keyof QueryParams;
type QueryParamEntry = readonly [QueryParamKey, string | undefined];

const queryParamBuilders: [QueryParamKey, (filter: TaskListFilter) => string | undefined][] = [
  ['hideUnreported', (filter: TaskListFilter) => filter.hideUnreported ? String(filter.hideUnreported) : undefined],
  ['date', (filter: TaskListFilter) => filter.date ?? undefined],
  ['startDate', (filter: TaskListFilter) => filter.startDate ?? undefined],
  ['endDate', (filter: TaskListFilter) => filter.endDate ?? undefined],
  ['tags', (filter: TaskListFilter) => filter.tags ? filter.tags.join(',') : undefined],
  ['name', (filter: TaskListFilter) => filter.name],
];

@Service()
export class TaskQuery {
  private readonly apiRequestService: ApiRequest = inject(ApiRequest);
  private readonly taskResource: ResourceRequestHandle = this.apiRequestService.resource('task');

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
            buildValue(filter),
          ] as QueryParamEntry,
        )
        .filter((entry: QueryParamEntry) => entry[1] !== undefined) as [QueryParamKey, string][],
    ) as QueryParams;
  }
}
