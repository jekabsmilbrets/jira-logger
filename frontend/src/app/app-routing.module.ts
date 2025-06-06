import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '**',
    redirectTo: '**',
  },
];

@NgModule(
  {
    imports: [RouterModule.forRoot(routes, { useHash: false })],
    exports: [RouterModule],
  },
)
export class AppRoutingModule {
}
