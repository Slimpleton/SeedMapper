import { Inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import { merge, Observable, of, Subject } from 'rxjs';
import { filter, map, switchMap, takeUntil, shareReplay, tap, catchError } from 'rxjs/operators';
import { County, CountyCSVItem, StateInfo } from '../models/gov/models';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Meta, MetaDefinition, Title } from '@angular/platform-browser';

@Injectable({
    providedIn: 'root'
})
export class PositionService implements OnDestroy {
    private readonly _ngDestroy$: Subject<void> = new Subject<void>();
    private _positionEmitter$: Subject<GeolocationPosition> = new Subject<GeolocationPosition>();
    private get positionEmitter$(): Observable<GeolocationPosition> {
        return this._positionEmitter$.asObservable().pipe(filter(x => x != undefined));
    }

    private readonly _manualStateSetter$: Subject<StateInfo> = new Subject<StateInfo>();
    public set manualState(value: StateInfo) {
        this._manualStateSetter$.next(value);
    }

    private readonly _manualCountySetter$: Subject<County> = new Subject<County>();
    public set manualCounty(value: County) {
        this._manualCountySetter$.next(value);
    }

    private readonly _stateEmitter$: Observable<StateInfo> = this.positionEmitter$.pipe(
        switchMap((position: GeolocationPosition) =>
            this._http.post<{ stateCsvItem: StateInfo | null }>('/api/geolocation/state', position.coords).pipe(map(response => response.stateCsvItem))),
        filter((state: StateInfo | null): state is StateInfo => state != null),
        takeUntil(this._ngDestroy$));

    public readonly stateEmitter$: Observable<StateInfo> = merge(this._manualStateSetter$, this._stateEmitter$).pipe(
        tap(() => {
            // TODO get state name here
            // TODO add title and meta tag changes here 
            if (isPlatformBrowser(this._platformId)) {

            }
        }),
        shareReplay(1),
        takeUntil(this._ngDestroy$));

    private readonly _countyEmitter$: Observable<County> = this.positionEmitter$.pipe(
        switchMap((position: GeolocationPosition) => this._http.post<County | undefined>('/api/geolocation/county', position.coords)),
        filter((county: County | undefined): county is County => county != undefined),
        // TODO do i let it emit undefined and search all counties if undefined? idk man
        takeUntil(this._ngDestroy$));

    public readonly countyEmitter$: Observable<County> = merge(this._manualCountySetter$, this._countyEmitter$).pipe(
        tap((county: County) => {
            if (isPlatformBrowser(this._platformId)) {
                this._http.get<CountyCSVItem>(`/api/counties/${county.stateFip}/${county.countyFip}`).pipe(
                    catchError((err) => { console.error(err); return of(null); })
                ).subscribe({
                    next: (countyCSV: CountyCSVItem | null) => {
                        this._title.setTitle(`Native plants in ${countyCSV?.countyName}, ${countyCSV?.stateAbbrev} | What Grows Native Here`);
                    }
                })
            }
        }),
        shareReplay(1),
        takeUntil(this._ngDestroy$));

    constructor(private readonly _http: HttpClient,
        @Inject(PLATFORM_ID) private readonly _platformId: object,
        private readonly _title: Title,
    ) {
        if (isPlatformBrowser(this._platformId) && "geolocation" in navigator)
            navigator.geolocation.getCurrentPosition((position: GeolocationPosition) => this.emitPosition(position), (err) => { console.error(err) });
        // TODO geolocation.watchPosition is a handler fcn register that gets updates use in future maybe ?? prob not tho
    }

    private emitPosition(position: GeolocationPosition): void {
        this._positionEmitter$.next(position);
    }

    public ngOnDestroy(): void {
        this._ngDestroy$.next();
        this._ngDestroy$.complete();
    }
}
