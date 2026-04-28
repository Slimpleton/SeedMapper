import { ChangeDetectionStrategy, Component, computed, ElementRef, Inject, inject, Input, PLATFORM_ID, signal, ViewChild } from '@angular/core';
import { PlantData } from '../models/gov/models';
import { isPlatformBrowser, TitleCasePipe } from '@angular/common';
import { GovPlantsDataService } from '../services/PLANTS_data.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { Router } from '@angular/router';
import { PlantOverviewRouteData } from '../app.routes';
import { IconComponent } from '../icon/icon.component';
import { MapService } from '../services/map.service';
import { TooltipDirective } from "../directives/tooltip.directive";
import { INaturalistService } from '../services/inaturalist.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'plant-tile',
  imports: [TitleCasePipe, TranslocoPipe, IconComponent, TooltipDirective],
  templateUrl: './plant-tile.component.html',
  styleUrl: './plant-tile.component.css',
  standalone: true
})
export class PlantTileComponent {
  public get usdaGovPlantProfileUrl(): string { return GovPlantsDataService.usdaGovPlantProfileUrl; }
  @ViewChild('map') public mapRef?: ElementRef<SVGSVGElement>;

  @Input({ required: true }) set plant(value: PlantData) {
    this.imageReady.set(false);
    this._plant.set(value);
    this._loadImage(value);
    this.showMap = false;
  }

  @Input() public isPriority: boolean = false;

  private readonly _src = signal('');
  private readonly _srcset = signal('');

  public readonly src = this._src.asReadonly();
  public readonly srcset = this._srcset.asReadonly();

  public get fullImageCredits() {
    return this.plant.photos?.at(0)?.fullCredits ?? '';
  }

  public get observerId() {
    return this.plant.photos?.at(0)?.observerId ?? NaN;
  }

  public get validCredits(): boolean {
    return this.fullImageCredits !== null && this.fullImageCredits !== undefined && this.fullImageCredits !== ''
  }


  private readonly _plant = signal<PlantData | null>(null);
  protected readonly imageReady = signal(false);

  protected readonly showImage = computed(() => {
    const photo = this._plant()?.photos?.at(0);
    return this.imageReady() && !!photo?.fullCredits;
  });

  get plant(): PlantData {
    return this._plant()!;
  }

  private _loadImage(plant: PlantData) {
    const firstPhoto = plant.photos?.at(0);
    if (firstPhoto) {
      const x = this._iNaturalistService.iNatSrcset(firstPhoto.photoId, firstPhoto.extension);
      this._src.set(x.src);
      this._srcset.set(x.srcset);
      this.imageReady.set(true);
    } else {
      this._src.set('');
      this._srcset.set('');
    }
  }

  public get viewBox(): string {
    return `0 0 ${MapService.PLANT_TILE_MAP_WIDTH} ${MapService.PLANT_TILE_MAP_HEIGHT}`
  }

  public showMap: boolean = false;
  private readonly _router = inject(Router);

  public constructor(private readonly _iNaturalistService: INaturalistService,
    @Inject(PLATFORM_ID) private readonly _platformId: object
  ) {
  }


  public get growthHabitKeys(): string[] {
    if (!this.plant?.growthHabit || this.plant.growthHabit.size === 0) {
      return [];
    }
    return [...this.plant.growthHabit].map(x => 'GROWTH_HABITS.' + x.toUpperCase());
  }

  public get plantDuration(): string {
    return [...this.plant.duration].join(', ');
  }

  public openInfoPage() {
    this._router.navigate(['plant/raw/' + this.plant.acceptedSymbol], { state: <PlantOverviewRouteData>{ plant: this.plant } });
  }

  public get combinedCountyFips(): string[] {
    return this.plant.combinedCountyFIPs;
  }

  public async openFullscreen(img: HTMLImageElement): Promise<void> {
    if (!isPlatformBrowser(this._platformId)) return;

    const fsOptions = <FullscreenOptions>{
      navigationUI: 'show'
    };
    await img.requestFullscreen(fsOptions);
    const firstPhoto = this.plant.photos!.at(0);
    const fullRes = this._iNaturalistService.iNatBest(
      firstPhoto!.photoId,
      this.getBestFullscreenSize()
    );

    const preload = new Image();
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
}
