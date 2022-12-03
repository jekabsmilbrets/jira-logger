import { Component } from '@angular/core';

import { Observable } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';


@Component(
  {
    selector: 'app-layout',
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.scss'],
  },
)
export class LayoutComponent {
  public isLoading$!: Observable<boolean>;

  constructor(
    private loaderStateService: LoaderStateService,
  ) {
    this.isLoading$ = this.loaderStateService.isLoading$;
  }
}
