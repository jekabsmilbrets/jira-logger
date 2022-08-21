import { NgModule } from '@angular/core';

import { CoreModule } from '@core/core.module';

import { SharedModule } from '@shared/shared.module';

import { HeaderComponent }       from './components/header/header.component';
import { SidenavComponent }      from './components/sidenav/sidenav.component';
import { LayoutRoutingModule }   from './layout-routing.module';
import { LayoutComponent }       from './views/layout/layout.component';
import { PageNotFoundComponent } from './views/page-not-found/page-not-found.component';


@NgModule(
  {
    declarations: [
      LayoutComponent,
      PageNotFoundComponent,
      HeaderComponent,
      SidenavComponent,
    ],
    imports: [
      LayoutRoutingModule,
      CoreModule,
      SharedModule,
    ],
  },
)
export class LayoutModule {
}
