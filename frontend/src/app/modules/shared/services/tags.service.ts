import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from 'environments/environment';

import { BehaviorSubject, catchError, map, Observable, tap, throwError, switchMap } from 'rxjs';

import { JsonApi }     from '@core/interfaces/json-api.interface';
import { waitForTurn } from '@core/utils/wait-for.utility';

import { adaptTags } from '@shared/adapters/api-tag.adapter';
import { ApiTag }    from '@shared/interfaces/api/api-tag.interface';

import { Tag } from '@shared/models/tag.model';


@Injectable(
  {
    providedIn: 'root',
  },
)
export class TagsService {
  public isLoading$: Observable<boolean>;
  public tags$: Observable<Tag[]>;

  private tagsSubject: BehaviorSubject<Tag[]> = new BehaviorSubject<Tag[]>([]);

  private basePath = 'tag';

  private isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
  ) {
    this.tags$ = this.tagsSubject.asObservable();
    this.isLoading$ = this.isLoadingSubject.asObservable();
  }

  public fetchTags(): Observable<Tag[]> {
    const url = `${environment.apiHost}${environment.apiBase}/${this.basePath}`;

    return waitForTurn(this.isLoading$, this.isLoadingSubject)
      .pipe(
        switchMap(() => this.http.get<JsonApi<ApiTag[]>>(url)),
        catchError((error) => {
          console.error(error);
          this.isLoadingSubject.next(false);
          return throwError(() => new Error(error));
        }),
        tap(() => this.isLoadingSubject.next(false)),
        map((response: JsonApi<ApiTag[]>) => (response.data && adaptTags(response.data)) as Tag[]),
        tap((tags: Tag[]) => this.tagsSubject.next(tags)),
      );
  }
}
