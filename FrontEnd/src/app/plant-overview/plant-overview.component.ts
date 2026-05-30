import { ChangeDetectionStrategy, Component, computed, ElementRef, Inject, input, OnInit, PLATFORM_ID, signal, viewChild } from '@angular/core';
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
import { Tab, Tabs, TabList, TabPanel, TabContent } from '@angular/aria/tabs';
import { IconComponent } from '../icon/icon.component';
import { LoaderComponent } from '../loader/loader.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-plant-overview',
  imports: [TranslocoPipe, TitleCasePipe, KeyValuePipe, CamelSplitPipe, AsyncPipe, TooltipDirective, TabList, Tab, Tabs, TabPanel, TabContent, IconComponent, LoaderComponent],
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
  protected readonly image = viewChild<HTMLImageElement>('img');

  protected selectedTab = signal<string>('Overview');

  private imgIndex = signal(0);
  protected readonly imageReady = signal(false);
  protected readonly showImage = computed(() => {
    const photo = this.plant()?.photos?.at(this.imgIndex());
    return this.imageReady() && !!photo?.fullCredits;
  });

  private readonly _src = signal('');
  private readonly _srcset = signal('');

  public readonly src = this._src.asReadonly();
  public readonly srcset = this._srcset.asReadonly();


  public constructor(public readonly mapService: MapService,
    @Inject(PLATFORM_ID) private readonly _platformId: object,
    private readonly _title: Title, private readonly _meta: Meta,
    private readonly _titleCasePipe: TitleCasePipe,
    private readonly _iNaturalistService: INaturalistService) {
  }

  public get fullImageCredits() {
    return this.plant().photos?.at(this.imgIndex())?.fullCredits ?? '';
  }

  public get observerId() {
    return this.plant().photos?.at(this.imgIndex())?.observerId ?? NaN;
  }

  public get validCredits(): boolean {
    return this.fullImageCredits !== null && this.fullImageCredits !== undefined && this.fullImageCredits !== ''
  }

  // TODO replace with custom fullscreen overlay cuz .requestFullscreen sucks
  public async openFullscreen(img: HTMLImageElement): Promise<void> {
    if (!isPlatformBrowser(this._platformId)) return;

    const fsOptions = <FullscreenOptions>{
      navigationUI: 'show'
    };
    await img.requestFullscreen(fsOptions);
    const photo = this.plant().photos!.at(this.imgIndex());
    const fullRes = this._iNaturalistService.iNatBest(
      photo!.photoId,
      this.getBestFullscreenSize()
    );

    const preload = new Image();
    preload.crossOrigin = 'anonymous';
    preload.src = fullRes;

    preload.onload = () => {
      img.src = fullRes;
    };
  }


  private getBestFullscreenSize(): 'large' | 'original' {
    if (!isPlatformBrowser(this._platformId)) {
      return 'large';
    }

    const width = window.innerWidth * window.devicePixelRatio;
    return width <= 1024 ? 'large' : 'original';
  }

  private _loadImage(plant: PlantData) {
    const photo = plant.photos?.at(this.imgIndex());
    if (photo) {
      const x = this._iNaturalistService.iNatSrcset(photo.photoId, photo.extension);
      this._src.set(x.src);
      this._srcset.set(x.srcset);

    } else {
      this._src.set('');
      this._srcset.set('');
      this.imageReady.set(false);
    }
  }

  protected onImageLoad(): void {
    this.imageReady.set(true);
  }

  protected invalidateSrc(): void {
    this._src.set('');
    this._srcset.set('');
  }

  protected nextImage(): void {
    if (!isPlatformBrowser(this._platformId)) return;
    if (!this.imageReady()) return;
    this.imageReady.set(false);
    this.imgIndex.update((x) => x == this.plant()!.photos!.length - 1 ? 0 : ++x);
    this._loadImage(this.plant()!);
  }

  protected prevImage(): void {
    if (!isPlatformBrowser(this._platformId)) return;
    if (!this.imageReady()) return;
    this.imageReady.set(false);
    this.imgIndex.update((x) => x == 0 ? this.plant()!.photos!.length - 1 : --x);
    this._loadImage(this.plant()!);
  }

  ngOnInit(): void {
    let commonName = this.plant().commonName;
    commonName = this._titleCasePipe.transform(commonName);
    this._title.setTitle(`${commonName} aka ${this.plant().scientificName} | What Grows Native Here`);
    this._meta.updateTag({
      name: 'description',
      content: `Plant overview for ${commonName} that contains native region maps and more detailed characteristic data`
    });
    this._loadImage(this.plant());  
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
