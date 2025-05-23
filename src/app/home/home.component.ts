import { Component, OnDestroy, OnInit } from '@angular/core';
import { GbifService } from '../services/gbif.service';
import { map, Observable, of, shareReplay, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { AsyncPipe, NgFor } from '@angular/common';
import { GbifOccurrence } from '../models/gbif/gbif.occurrence';
import { PlantData } from '../models/gov/models';
import { GovPlantsDataService } from '../services/PLANTS_data.service';
import * as turf from "@turf/turf";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgFor, AsyncPipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  private _ngDestroy$: Subject<void> = new Subject<void>();

  private _positionEmitter$: Subject<GeolocationPosition> = new Subject<GeolocationPosition>();

  private allPlants$: Observable<ReadonlyArray<PlantData>> = this._plantService.loadPlantData()
    .pipe(
      tap(value => console.log('All Plants from Gov', value)),
      shareReplay(1),
      takeUntil(this._ngDestroy$)
    );

  // Initialize filtered plants to show all plants
  public filteredPlants$: Observable<ReadonlyArray<PlantData>> = this._positionEmitter$.pipe(
    switchMap((position: GeolocationPosition) => {
      const point = turf.point([1, 1]);
      return of();
    }),
  );

  private _lastUnfilteredSearch$: Subject<GbifOccurrence[]> = new Subject<GbifOccurrence[]>();
  private _lastSearch$: Observable<GbifOccurrence[]> = this._lastUnfilteredSearch$.pipe(
    //HACK gets all the non copies of plants
    map((values) => {
      const plantMap: Map<string, GbifOccurrence> = new Map<string, GbifOccurrence>()
      values?.map((value: GbifOccurrence) => plantMap.set(value.species, value));
      return ([...plantMap.values()] as GbifOccurrence[]);
    }),
    map((values) => values.sort((x, y) => x.acceptedScientificName.localeCompare(y.acceptedScientificName))),
    tap((values) => console.log('without duplicates', values)),
    // switchMap((values) => from(values)),

    // // tap((occurrence) => {
    // //   this._gbifService.searchLiterature(occurrence.speciesKey).subscribe((value) => console.log(value));
    // // }),
    // // switchMap((occurrence: GbifOccurrence) => forkJoin([of(occurrence), this._gbifService.isNativeSpecies(occurrence.speciesKey)])),
    // // filter((value: [GbifOccurrence, boolean]) => value[1]),
    // // map((value: [GbifOccurrence, boolean]) => value[0]),
    // reduce((aggregate: GbifOccurrence[], current: GbifOccurrence) => {
    //   aggregate.push(current);
    //   return aggregate;
    // }, [] as GbifOccurrence[]),
    // TODO search each species to ensure its native somehow using gbif service again
    // TODO the socal area used to belong to the tongva people. visit the tongva community garden in pomona to learn more
    shareReplay(1)
  );
  public get lastSearch$(): Observable<GbifOccurrence[]> {
    return this._lastSearch$;
  }

  // HACK theres also a sql file if im lazy and i want to query against a db but that feels.... unnecessary
  // TODO make a json reader for the plant_list_2024012.json.gz aka zenodo.org records low prior because no occurence / nativity data

  // TODO possibly use webcrawlers to gather information about local flora using more local websites?? low priority

  // TODO make a calflora service cuz their db is extensive possibly with many records
  // TODO make a reader for the gbif occurrence download records

  public constructor(private readonly _gbifService: GbifService, private readonly _plantService: GovPlantsDataService) { }

  ngOnDestroy(): void {
    this._ngDestroy$.next();
    this._ngDestroy$.complete();
  }

  ngOnInit(): void {
    // Load plant data and share the result to avoid multiple HTTP requests
    this.allPlants$.subscribe({
      error: err => console.error(err)
    });

    if ("geolocation" in navigator) {
      // TODO geolocation.watchPosition is a handler fcn register that gets updates use in future maybe ?? prob not tho
      navigator.geolocation.getCurrentPosition((position: GeolocationPosition) => this.emitPosition(position), (err) => { console.error(err) });
    }

    this._gbifService.getUSAStateCounties(5).subscribe({
      next: (value) => console.log(value),
      error: err => console.error(err)
    });

    // TODO on search, might be cool to scrape the web for results on most common name associated with scientific name if i cant find an official mapping 
    // HACK the plant list json / sql would probably have common name mappings

    this._positionEmitter$.pipe(
      tap((pos) => console.log(pos)),
      switchMap((pos: GeolocationPosition) => this._gbifService.searchNativePlants(pos.coords.latitude, pos.coords.longitude)),
      // switchMap((pos: GeolocationPosition) => this._gbifService.searchNativePlants(36.75711952163049, -119.86352313029386)), 
    ).subscribe({
      next: (value: GbifOccurrence[]) => {
        this._lastUnfilteredSearch$.next(value);
        console.log('With duplicates', value);
      },
      error: err => console.error(err)
    });


  }

  // TODO use d3-geo and us-atlas to display maps of the geo locations
  // TODO use d3-geo / us-atlas maps to display gbif occurence data and other occurence data??? 


  private emitPosition(position: GeolocationPosition): void {
    this._positionEmitter$.next(position);
  }
}
