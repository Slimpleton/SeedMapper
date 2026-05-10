import { RenderMode, ServerRoute } from '@angular/ssr';
import { Route } from './app.routes';

export const serverRoutes: ServerRoute[] = [

  {
    path: Route.searchRoute,
    renderMode: RenderMode.Server
  },
  {
    path: Route.plantRawRoute,
    renderMode: RenderMode.Server
  },
  {
    path: Route.aboutRoute,
    renderMode: RenderMode.Prerender
  },
  {
    path: '**',
    renderMode: RenderMode.Server
  },
];
