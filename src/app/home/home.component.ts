import { Component, OnDestroy, OnInit } from '@angular/core';
import { GbifService } from '../services/gbif.service';
import { BehaviorSubject, Observable, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { GBIFPageableResult } from '../models/gbif.pageable-result';
import { GbifOccurrence } from '../models/gbif.occurrence';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {

  private _ngDestroy$: Subject<void> = new Subject<void>();
  private _positionEmitter$: Subject<GeolocationPosition> = new Subject<GeolocationPosition>();
  private _lastSearch$: BehaviorSubject<GbifOccurrence[] | null> = new BehaviorSubject<GbifOccurrence[] | null>(null);
  public get lastSearch$(): Observable<GbifOccurrence[] | null> {
    return this._lastSearch$;
  }

  // HACK theres also a sql file if im lazy and i want to query against a db but that feels.... unnecessary
  // TODO make a json reader for the plant_list_2024012.json.gz aka zenodo.org records low prior because no occurence / nativity data
  // TODO make a reader for the gbif occurence download records


  public constructor(private readonly _gbifService: GbifService) { }

  ngOnDestroy(): void {
    this._ngDestroy$.next();
    this._ngDestroy$.complete();
  }

  ngOnInit(): void {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position: GeolocationPosition) => this.emitPosition(position), (err) => { console.error(err) });
    }

    this._gbifService.getUSAStateCounties(5).subscribe({
      next: (value) => console.log(value),
      error: err => console.error(err)
    });

    // TODO on search, might be cool to scrape the web for results on most common name associated with scientific name if i cant find an official mapping 
    this._positionEmitter$.pipe(
      tap((pos) => console.log(pos)),
      switchMap((pos: GeolocationPosition) => this._gbifService.searchNativePlants(pos.coords.latitude, pos.coords.longitude)),
      // switchMap((pos: GeolocationPosition) => this._gbifService.searchNativePlants(36.75711952163049, -119.86352313029386)), 
    ).subscribe({
      next: (value: GbifOccurrence[]) => {
        this._lastSearch$.next(value);
        console.log(value);
      },
      error: err => console.error(err)
    });

    // this._gbifService.getScientificName('white oak')
    //   .pipe(takeUntil(this._ngDestroy$))
    //   .subscribe({
    //     next: (scientificName: string) => {
    //       console.log(scientificName);
    //     },
    //     error: err => console.error(err)
    //   })
  }

  private emitPosition(position: GeolocationPosition): void {
    this._positionEmitter$.next(position);
  }
}
