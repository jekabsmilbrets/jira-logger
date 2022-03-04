import { NgModule } from '@angular/core';

import { DynamicMenuDirective } from './directives/dynamic-menu.directive';
import { DynamicMenuService }   from './services/dynamic-menu.service';
import { StorageService }       from './services/storage.service';

@NgModule({
  providers: [
    StorageService,
    DynamicMenuService,
  ],
  declarations: [
    DynamicMenuDirective,
  ],
  exports: [
    DynamicMenuDirective,
  ],
})
export class CoreModule {
}
