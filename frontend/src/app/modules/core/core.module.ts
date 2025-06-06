import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { DynamicMenuDirective } from './directives/dynamic-menu.directive';

@NgModule(
  {
    declarations: [
      DynamicMenuDirective,
    ],
    exports: [
      DynamicMenuDirective,
    ],
    providers: [
      provideHttpClient(withInterceptorsFromDi()),
    ],
  },
)
export class CoreModule {
}
