import { Component, OnDestroy, OnInit } from '@angular/core';
import { GbifService } from '../services/gbif.service';
import { BehaviorSubject, Observable, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';

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
  private _lastSearch$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  public get lastSearch$() : Observable<any> {
    return this._lastSearch$;
  }

  public constructor(private readonly _gbifService: GbifService) { }

  ngOnDestroy(): void {
    this._ngDestroy$.next();
    this._ngDestroy$.complete();
  }

  ngOnInit(): void {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position: GeolocationPosition) => this.emitPosition(position), (err) => { console.error(err) });
    }

    this._positionEmitter$.pipe(
      tap((pos) => console.log(pos)),
      switchMap((pos: GeolocationPosition) => this._gbifService.searchNativePlants(pos.coords.latitude, pos.coords.longitude)),
      takeUntil(this._ngDestroy$)
    ).subscribe({
      next: (value: any) => {
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
