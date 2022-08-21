import { HttpClientModule } from '@angular/common/http';
import { NgModule }         from '@angular/core';

import { DynamicMenuDirective } from './directives/dynamic-menu.directive';


@NgModule(
  {
    imports: [
      HttpClientModule,
    ],
    declarations: [
      DynamicMenuDirective,
    ],
    exports: [
      DynamicMenuDirective,
      HttpClientModule,
    ],
  },
)
export class CoreModule {
}
