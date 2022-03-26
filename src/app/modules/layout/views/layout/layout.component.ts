import { Component } from '@angular/core';

import { Observable } from 'rxjs';

import { StorageService } from '@core/services/storage.service';

@Component({
             selector: 'app-layout',
             templateUrl: './layout.component.html',
             styleUrls: ['./layout.component.scss'],
           })
export class LayoutComponent {
  public isLoading$: Observable<boolean>;

  constructor(
    private storageService: StorageService,
  ) {
    this.isLoading$ = this.storageService.isLoading$;
  }
}
