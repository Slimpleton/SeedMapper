import { ActivatedRouteSnapshot, RedirectCommand, ResolveData, ResolveFn, Router, Routes } from '@angular/router';
import { PlantData } from './models/gov/models';
import { of } from 'rxjs';
import { inject } from '@angular/core';
import { GovPlantsDataService } from './services/PLANTS_data.service';

export enum Route {
    mapRoute = 'map',
    searchRoute = '',
    searchRouteAlt='search',
    plantRawRoute = 'plant/raw/:id',
    aboutRoute = 'about',
};

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
        path: Route.searchRoute,
        loadComponent: () => import('./home/home.component').then(x => x.HomeComponent),
    },
    {
        path: Route.searchRouteAlt,
        loadComponent: () => import('./home/home.component').then(x => x.HomeComponent),
    },
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
];
