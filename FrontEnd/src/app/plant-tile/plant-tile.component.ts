import { ChangeDetectionStrategy, Component, ElementRef, inject, Input, OnInit, ViewChild } from '@angular/core';
import { PlantData } from '../models/gov/models';
import { TitleCasePipe } from '@angular/common';
import { GovPlantsDataService } from '../services/PLANTS_data.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { Router } from '@angular/router';
import { PlantOverviewRouteData } from '../app.routes';
import { IconComponent, IconName } from '../icon/icon.component';
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
export class PlantTileComponent implements OnInit {
  public get usdaGovPlantProfileUrl(): string { return GovPlantsDataService.usdaGovPlantProfileUrl; }
  @Input({ required: true }) public plant!: PlantData;
  @ViewChild('map') public mapRef?: ElementRef<SVGSVGElement>;


  public get viewBox(): string {
    return `0 0 ${MapService.PLANT_TILE_MAP_WIDTH} ${MapService.PLANT_TILE_MAP_HEIGHT}`
  }

  private _src: string = '';
  private _srcset: string = '';

  public get src(): string {
    return this._src;
  }

  public get srcset(): string {
    return this._srcset;
  }

  public showMap: boolean = false;
  private readonly _router = inject(Router);

  public constructor(private readonly _mapService: MapService, private readonly _iNaturalistService: INaturalistService) {
  }
  ngOnInit(): void {
    const firstPhoto = this.plant.photos?.at(0);
    if (firstPhoto) {
      const x = this._iNaturalistService.iNatSrcset(firstPhoto.photoId, firstPhoto.extension)
      this._src = x.src;
      this._srcset = x.srcset;
    }
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

  public get iconName(): IconName {
    switch (this.plant.shadeTolerance) {
      case 'Intermediate':
        return 'partly-cloudy';
      case 'Intolerant':
        return 'sunny';
      case 'Tolerant':
        return 'cloud';
    }
  }

  public get combinedCountyFips(): string[] {
    return this.plant.combinedCountyFIPs;
  }

  // TODO lazy load the better img here
  public openFullscreen(img: HTMLImageElement): Promise<void> {
    const fsOptions = <FullscreenOptions>{
      navigationUI: 'show'
    };
    return img.requestFullscreen(fsOptions);
  }
}
