import { afterNextRender, ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, PLATFORM_ID, signal, ViewChild } from '@angular/core';
import { CdkVirtualForOf, CdkVirtualScrollViewport, } from '@angular/cdk/scrolling';
import { PlantSearchComponent } from '../plant-search/plant-search.component';
import { PlantData } from '../models/gov/models';
import { PlantTileComponent } from '../plant-tile/plant-tile.component';
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { MapPath, MapService } from '../services/map.service';
import { debounceTime, fromEvent, merge, Observable, of, } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { GridVirtualScrollDirective } from '../directives/grid-virtual-scroll.directive';
import { TranslocoPipe } from '@jsverse/transloco';
import { LoaderComponent } from '../loader/loader.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home',
  standalone: true,
  imports: [GridVirtualScrollDirective, CdkVirtualScrollViewport, CdkVirtualForOf, PlantSearchComponent, PlantTileComponent, AsyncPipe, TranslocoPipe, LoaderComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  @ViewChild('gridScroll') private readonly _gridScroll?: GridVirtualScrollDirective;
  protected plantData = signal<Readonly<PlantData>[]>([]);
  protected readonly plantData$ = toObservable(this.plantData);
  public readonly itemSize = 360;
  public readonly gutterSize = 4;
  public columns = 1;
  public readonly itemWidth: number = this.itemSize * 1.25;
  public readonly Math = Math;

  public get rowHeight(): number {
    return this.itemSize + this.gutterSize;
  }

  public get PLANT_TILE_MAP_WIDTH(): number { return MapService.PLANT_TILE_MAP_WIDTH; }
  public get PLANT_TILE_MAP_HEIGHT(): number { return MapService.PLANT_TILE_MAP_HEIGHT; }
  public readonly countiesPaths$: Observable<MapPath[]> = this.isBrowser ? this.mapService.countiesPaths$(this.PLANT_TILE_MAP_WIDTH, this.PLANT_TILE_MAP_HEIGHT) : of([]);

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


  public constructor(@Inject(PLATFORM_ID) private readonly _platformId: object, private readonly _cdr: ChangeDetectorRef, public readonly mapService: MapService) {
    afterNextRender({ write: () => this.calculateColumns() });
    merge(fromEvent(window, 'resize').pipe(debounceTime(150)), fromEvent(screen.orientation, 'change')).subscribe(() => this.calculateColumns());
  }

  public get isBrowser(): boolean {
    return isPlatformBrowser(this._platformId);
  }

  private calculateColumns(): void {
    if (!this.isBrowser) return;
    this.columns = Math.max(1, Math.floor(window.innerWidth / (this.itemWidth)));
    this._cdr.detectChanges();
  }

  public clearData(searchStart: boolean): void {
    if (searchStart) this.plantData.set([]);
  }

  public updatePlantData(receivedPlantData: ReadonlyArray<Readonly<PlantData>>): void {
    this.plantData.update(current => [...current, ...receivedPlantData]);
  }

  public trackByPlant(_: number, plant: PlantData): string {
    return plant.acceptedSymbol;
  }


  public isPlantPriority(index: number): boolean {
    if (!this._gridScroll) return true;
    const { start, end } = this._gridScroll.getVisibleRange();
    return index >= start && index < end;
  }
}
