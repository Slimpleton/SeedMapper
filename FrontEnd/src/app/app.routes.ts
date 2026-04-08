import { ActivatedRouteSnapshot, RedirectCommand, ResolveData, ResolveFn, Router, Routes } from '@angular/router';
import { PlantData } from './models/gov/models';
import { of } from 'rxjs';
import { inject } from '@angular/core';
import { GovPlantsDataService } from './services/PLANTS_data.service';

export enum Route {
    searchRoute = ':stateAbbrev/:countyName',
    searchRouteState = ':stateAbbrev',
    searchRouteAlt = 'search/:stateAbbrev/:countyName',
    searchRouteAltState = 'search/:stateAbbrev',
    searchRouteAltBase = 'search',
    mapRoute = 'map',
    plantRawRoute = 'plant/raw/:id',
    aboutRoute = 'about',
}

export type SearchRouteParam = 'stateAbbrev' | 'countyName';
type PlantRouteParam = 'id';

// Map each route to its expected params
interface RouteParams {
    [Route.searchRoute]: Partial<Record<SearchRouteParam, string>>;
    [Route.searchRouteAlt]: Partial<Record<SearchRouteParam, string>>;
    [Route.searchRouteAltBase]: Partial<Record<SearchRouteParam, string>>;
    [Route.searchRouteState]: Partial<Record<SearchRouteParam, string>>;
    [Route.searchRouteAltState]: Partial<Record<SearchRouteParam, string>>;
    [Route.plantRawRoute]: Record<PlantRouteParam, string>;
    [Route.mapRoute]: never;
    [Route.aboutRoute]: never;
}

// Overloads: routes with no params don't need a second argument
export function buildRoute(route: Route.mapRoute | Route.aboutRoute): string;
export function buildRoute<R extends keyof RouteParams>(
    route: R,
    params: RouteParams[R]
): string;
export function buildRoute(route: Route, params?: Record<string, string | undefined>): string {
    return route.replace(/:(\w+)\??/g, (_, key) => params?.[key] ?? '').replace(/\/+$/, '').replace(/\/{2,}/g, '/');
}

const plantOverviewResolver: ResolveFn<Readonly<PlantData> | RedirectCommand> = (route: ActivatedRouteSnapshot) => {
    const acceptedSymbol: string | null = route.paramMap.get('id');
    if (acceptedSymbol == null || acceptedSymbol.length == 0) {
        console.error('Invalid symbol detected, rerouting to different view');
        return new RedirectCommand(inject(Router).parseUrl(''));
    }

    if (route.data) {
        const routeData = route.data as PlantOverviewRouteData;
        if (routeData.plant != null)
            return of(routeData.plant);
    }

    return inject(GovPlantsDataService).getPlantById(acceptedSymbol);
};


export interface PlantOverviewResolveData extends ResolveData {
    plant: ResolveFn<PlantData>;
}

export type PlantOverviewRouteData = {
    plant: PlantData
};

// TODO search resolver with params for county & state names / county & state fips,


export const routes: Routes = [
    {
        path: Route.plantRawRoute,
        loadComponent: () => import('./plant-overview/plant-overview.component').then(x => x.PlantOverviewComponent),
        resolve: <PlantOverviewResolveData>{
            plant: plantOverviewResolver
        },
    },
    {
        path: Route.aboutRoute,
        loadComponent: () => import('./about/about.component').then(x => x.AboutComponent)
    },
    { path: Route.searchRoute, loadComponent: () => import('./home/home.component').then(x => x.HomeComponent) },
    { path: Route.searchRouteState, loadComponent: () => import('./home/home.component').then(x => x.HomeComponent) },
    { path: Route.searchRouteAlt, loadComponent: () => import('./home/home.component').then(x => x.HomeComponent) },
    { path: Route.searchRouteAltState, loadComponent: () => import('./home/home.component').then(x => x.HomeComponent) },
    { path: Route.searchRouteAltBase, loadComponent: () => import('./home/home.component').then(x => x.HomeComponent) },
    { path: '', loadComponent: () => import('./home/home.component').then(x => x.HomeComponent) },
];
