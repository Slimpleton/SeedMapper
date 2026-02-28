import { ChangeDetectionStrategy, Component, Inject, input, PLATFORM_ID } from '@angular/core';
import { PlantData } from '../models/gov/models';
import { AsyncPipe, isPlatformBrowser, KeyValuePipe, TitleCasePipe, NgClass } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { GovPlantsDataService } from '../services/PLANTS_data.service';
import { CamelSplitPipe } from "../pipes/camel-split.pipe";
import { MapPath, MapService } from '../services/map.service';
import { Observable, of } from 'rxjs';
import { TooltipDirective } from "../directives/tooltip.directive";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-plant-overview',
  imports: [TranslocoPipe, TitleCasePipe, KeyValuePipe, CamelSplitPipe, AsyncPipe, NgClass, TooltipDirective],
  templateUrl: './plant-overview.component.html',
  styleUrl: './plant-overview.component.css'
})
export class PlantOverviewComponent {

  public get PLANT_MAP_WIDTH(): number { return MapService.PLANT_OVERVIEW_MAP_WIDTH; }
  public get PLANT_MAP_HEIGHT(): number { return MapService.PLANT_OVERVIEW_MAP_HEIGHT; }
  public get usdaGovPlantProfileUrl(): string { return GovPlantsDataService.usdaGovPlantProfileUrl; }
  public plant = input.required<PlantData>();
  public readonly countiesPaths$: Observable<MapPath[]> = this.isBrowser ? this.mapService.countiesPaths$(this.PLANT_MAP_WIDTH, this.PLANT_MAP_HEIGHT) : of([]);
  
  public constructor(public readonly mapService: MapService, @Inject(PLATFORM_ID) private readonly _platformId: Object) { }

  public isIterableNotString(value: unknown): value is Iterable<unknown> {
    return value != null && typeof (value as Iterable<unknown>)[Symbol.iterator] === 'function' && typeof value !== 'string';
  }

  public getIterableString(values: Iterable<unknown>): string {
    return [...values].join(', ');
  }

  public get isBrowser(): boolean {
    return isPlatformBrowser(this._platformId);
  }
}
