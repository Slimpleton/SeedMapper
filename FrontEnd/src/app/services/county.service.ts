import { Injectable, OnDestroy, Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { combineCountyFIP, CountyCSVItem } from '../models/gov/models';
import { Observable, Subject } from 'rxjs';
import { map, shareReplay, take, takeUntil } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class CountyService implements OnDestroy {
    private readonly _destroy$: Subject<void> = new Subject<void>();

    public readonly counties$: Observable<CountyCSVItem[]> = this._http
        .get<CountyCSVItem[]>('/api/counties')
        .pipe(
            shareReplay({ bufferSize: 1, refCount: false }),
            takeUntil(this._destroy$)
        );
    public readonly countiesSignal: Signal<CountyCSVItem[] | undefined> = toSignal(this.counties$);

    public readonly countyLookup$: Observable<Map<string, CountyCSVItem>> = this.counties$.pipe(
        take(1),
        map(counties => {
            const map = new Map<string, CountyCSVItem>();
            for (const c of counties) {
                map.set(this.getCountyAndStateAbbrev(c), c);
            }
            return map;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
    );

    public readonly countyLookupSignal: Signal<Map<string, CountyCSVItem> | undefined> = toSignal(this.countyLookup$);
    public constructor(private readonly _http: HttpClient) { }

    public getCountyByFip(stateFip: number, countyFip: string): Observable<CountyCSVItem> {
        return this._http.get<CountyCSVItem>(`/api/counties/${stateFip}/${countyFip}`);
    }

    public getCountyAndStateAbbrev(c: CountyCSVItem): string {
        return this.formatCountyAndStateAbbrev(c.countyName, c.stateAbbrev);
    }

    public formatCountyAndStateAbbrev(countyName: string, stateAbbrev: string): string {
        return `${countyName} - ${stateAbbrev}`;
    }

    public trackCountyByCombinedFIP(county: CountyCSVItem): string {
        return combineCountyFIP(county);
    }

    public ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }
}