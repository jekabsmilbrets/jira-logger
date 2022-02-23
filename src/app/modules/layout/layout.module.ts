import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';

import { CoreModule } from '@core/core.module';

import { HeaderComponent } from './components/header/header.component';
import { SidenavComponent } from './components/sidenav/sidenav.component';
import { LayoutRoutingModule } from './layout-routing.module';
import { LayoutComponent } from './views/layout/layout.component';
import { PageNotFoundComponent } from './views/page-not-found/page-not-found.component';


@NgModule({
  declarations: [
    LayoutComponent,
    PageNotFoundComponent,
    HeaderComponent,
    SidenavComponent,
  ],
  imports: [
    CommonModule,
    LayoutRoutingModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    CoreModule,
  ],
})
export class LayoutModule {
}
