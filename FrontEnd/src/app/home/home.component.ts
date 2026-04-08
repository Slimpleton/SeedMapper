import { afterNextRender, ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CdkFixedSizeVirtualScroll, CdkVirtualForOf, CdkVirtualScrollViewport, } from '@angular/cdk/scrolling';
import { PlantSearchComponent } from '../plant-search/plant-search.component';
import { PlantData } from '../models/gov/models';
import { PlantTileComponent } from '../plant-tile/plant-tile.component';
import { AsyncPipe, isPlatformBrowser, } from '@angular/common';
import { MapPath, MapService } from '../services/map.service';
import { Observable, of } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home',
  standalone: true,
  imports: [CdkFixedSizeVirtualScroll, CdkVirtualScrollViewport, CdkVirtualForOf, PlantSearchComponent, PlantTileComponent, AsyncPipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  public plantData: Readonly<PlantData>[] = [];
  public get PLANT_TILE_MAP_WIDTH(): number { return MapService.PLANT_TILE_MAP_WIDTH; }
  public get PLANT_TILE_MAP_HEIGHT(): number { return MapService.PLANT_TILE_MAP_HEIGHT; }
  public readonly countiesPaths$: Observable<MapPath[]> = this.isBrowser ? this.mapService.countiesPaths$(this.PLANT_TILE_MAP_WIDTH, this.PLANT_TILE_MAP_HEIGHT) : of([]);

  // private _lastUnfilteredSearch$: Subject<GbifOccurrence[]> = new Subject<GbifOccurrence[]>();
  // private _lastSearch$: Observable<GbifOccurrence[]> = this._lastUnfilteredSearch$.pipe(
  //   //HACK gets all the non copies of plants
  //   map((values) => {
  //     const plantMap: Map<string, GbifOccurrence> = new Map<string, GbifOccurrence>()
  //     values?.map((value: GbifOccurrence) => plantMap.set(value.species, value));
  //     return ([...plantMap.values()] as GbifOccurrence[]);
  //   }),
  //   map((values) => values.sort((x, y) => x.acceptedScientificName.localeCompare(y.acceptedScientificName))),
  // tap((values) => console.log('without duplicates', values)),
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

  // TODO the socal area used to belong to the tongva people. visit the tongva community garden in pomona to learn more
  // shareReplay(1)
  // );

  // public get lastSearch$(): Observable<GbifOccurrence[]> {
  //   return this._lastSearch$;
  // }

  // PRIORITIES 
  // MEDIUM 
  // TODO make a calflora service cuz their db is extensive possibly with many records
  // TODO  display gbif occurence data and other occurence data??? 
  // TODO use inaturalist api for occurrences as well, research grade only, use for occurrences because its community driven
  // https://explorer.natureserve.org/api-docs/#_species_search OnlyNatives for locationCriteria will get only the native species we search !! might have some info on occurrences here too not sure could also get a combined accurate record of native plants 
  // TODO trefle api has open source botanical indexed plants and stuff too, probably use for occurrences because native declaration is weak


  // HIGH 
  // TODO make a reader for the gbif occurrence download records
  // TODO inaturalist images from occurrences, look for non copyright 
  // Maps are drawn on canvas btw its not like ur unfamiliar with it

  // TODO group the plant items into column rows based on the generated column number / result size
  public readonly itemSize: number = 400;
  public readonly itemWidth: number = this.itemSize * 1.25;
  public readonly gutterSize: number = 4;

  public columns: number = 1;
  public constructor(@Inject(PLATFORM_ID) private readonly _platformId: object, private readonly _cdr: ChangeDetectorRef, public readonly mapService: MapService) {
    afterNextRender({ write: () => this.calculateColumns() });
  }

  public get isBrowser(): boolean {
    return isPlatformBrowser(this._platformId);
  }

  private calculateColumns() {
    if (this.isBrowser) {
      const windowWidth = window.innerWidth;
      this.columns = Math.max(1, Math.floor(windowWidth / (this.itemWidth)));
      this._cdr.markForCheck();
    }
  }

  @HostListener('screen.orientation.change', ['$event'])
  @HostListener('window:resize', ['$event'])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onResizeOrRotate(_: Event) {
    this.calculateColumns();
  }

  public clearData(searchStart: boolean): void {
    if (searchStart) {
      this.plantData = [];
      this._cdr.markForCheck();
    }

  }

  public updatePlantData(receivedPlantData: ReadonlyArray<Readonly<PlantData>>) {
    // TODO calculate avg number of items on screen using variables above + added buffer of items to decide batch size and load what fills the page with a min
    // HACK recommended way to fill this arr
    this.plantData = [...this.plantData, ...receivedPlantData];
    this._cdr.markForCheck();
  }

  public trackByPlant(_: number, plant: PlantData): string {
    return plant.acceptedSymbol;
  }
}
