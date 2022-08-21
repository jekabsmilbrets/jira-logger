import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from 'environments/environment';

import { Observable, BehaviorSubject, tap, catchError, throwError, map } from 'rxjs';

import { adaptMonitor } from '@core/adapters/monitor.adapter';
import { ApiMonitor }   from '@core/interfaces/api/monitor.interface';
import { JsonApi }      from '@core/interfaces/json-api.interface';
import { Monitor }      from '@core/models/monitor.model';


@Injectable(
  {
    providedIn: 'root',
  },
)
export class MonitorService {
  public monitor$: Observable<Monitor | undefined>;
  public hasIssues$: Observable<boolean>;

  private monitorSubject: BehaviorSubject<Monitor | undefined> = new BehaviorSubject<Monitor | undefined>(undefined);
  private hasIssuesSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  private basePath = 'monitor';

  constructor(
    private http: HttpClient,
  ) {
    this.monitor$ = this.monitorSubject.asObservable();
    this.hasIssues$ = this.hasIssuesSubject.asObservable();
  }

  public callMonitor(): Observable<Monitor> {
    const url = `${environment.apiHost}${environment.apiBase}/${this.basePath}`;

    this.hasIssuesSubject.next(false);

    return this.http.get<JsonApi<ApiMonitor>>(url)
               .pipe(
                 catchError((error) => {
                   console.error(error);
                   this.hasIssuesSubject.next(true);
                   return throwError(() => new Error('Monitor unavailable'));
                 }),
                 map((response: JsonApi<ApiMonitor>) => (response.data && adaptMonitor(response.data)) as Monitor),
                 tap((monitor: Monitor) => this.monitorSubject.next(monitor)),
               );
  }
}
