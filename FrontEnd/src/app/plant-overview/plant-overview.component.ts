import { ChangeDetectionStrategy, Component, Inject, input, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { PlantData } from '../models/gov/models';
import { AsyncPipe, isPlatformBrowser, KeyValuePipe, TitleCasePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { GovPlantsDataService } from '../services/PLANTS_data.service';
import { CamelSplitPipe } from "../pipes/camel-split.pipe";
import { MapPath, MapService } from '../services/map.service';
import { Observable, of } from 'rxjs';
import { TooltipDirective } from "../directives/tooltip.directive";
import { Meta, Title } from '@angular/platform-browser';
import { INaturalistService } from '../services/inaturalist.service';
import {Tab, Tabs, TabList, TabPanel, TabContent} from '@angular/aria/tabs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-plant-overview',
  imports: [TranslocoPipe, TitleCasePipe, KeyValuePipe, CamelSplitPipe, AsyncPipe, TooltipDirective, TabList, Tab, Tabs, TabPanel, TabContent],
  providers: [TitleCasePipe],
  templateUrl: './plant-overview.component.html',
  styleUrl: './plant-overview.component.css'
})
export class PlantOverviewComponent implements OnInit {
  public get iNaturalistObservationUrl(): string { return INaturalistService.observationUrl; }
  public get PLANT_MAP_WIDTH(): number { return MapService.PLANT_OVERVIEW_MAP_WIDTH; }
  public get PLANT_MAP_HEIGHT(): number { return MapService.PLANT_OVERVIEW_MAP_HEIGHT; }
  public get usdaGovPlantProfileUrl(): string { return GovPlantsDataService.usdaGovPlantProfileUrl; }
  public plant = input.required<PlantData>();
  public readonly countiesPaths$: Observable<MapPath[]> = this.isBrowser ? this.mapService.countiesPaths$(this.PLANT_MAP_WIDTH, this.PLANT_MAP_HEIGHT) : of([]);
  public readonly statesPaths$: Observable<MapPath[]> = this.isBrowser ? this.mapService.statesPaths$(this.PLANT_MAP_WIDTH, this.PLANT_MAP_HEIGHT) : of([]);
  protected selectedTab = signal<string>('Images');
  public constructor(public readonly mapService: MapService,
    @Inject(PLATFORM_ID) private readonly _platformId: object,
    private readonly _title: Title, private readonly _meta: Meta,
    private readonly _titleCasePipe: TitleCasePipe) {
  }
  ngOnInit(): void {
    let commonName = this.plant().commonName;
    commonName = this._titleCasePipe.transform(commonName);
    this._title.setTitle(`${commonName} aka ${this.plant().scientificName} | What Grows Native Here`);
    this._meta.updateTag({
      name: 'description',
      content: `Plant overview for ${commonName} that contains native region maps and more detailed characteristic data`
    });
    console.log(this.plant());
  }

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
