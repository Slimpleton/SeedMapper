import { Component, EventEmitter, Output, OnDestroy, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { combineCountyFIP, CountyCSVItem, Duration, GrowthHabit, PlantData } from '../models/gov/models';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { AsyncPipe, UpperCasePipe } from '@angular/common';
import { Observable } from 'rxjs/internal/Observable';
import { GovPlantsDataService } from '../services/PLANTS_data.service';
import { PositionService } from '../services/position.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { debounceTime, distinctUntilChanged, map, tap, switchMap, takeUntil, filter, shareReplay, take, withLatestFrom } from 'rxjs/operators';
import { combineLatest, merge, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Meta, MetaDefinition, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { buildRoute, Route, SearchRouteParam } from '../app.routes';

export type SortOption = keyof Pick<PlantData, 'commonName' | 'scientificName' | 'symbol'>;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'plant-search',
  imports: [TranslocoPipe, UpperCasePipe, AsyncPipe],
  templateUrl: './plant-search.component.html',
  styleUrl: './plant-search.component.css'
})
export class PlantSearchComponent implements OnDestroy {
  public growthHabits: GrowthHabit[] = ['Any', 'Forb/herb', 'Graminoid', 'Nonvascular', 'Shrub', 'Subshrub', 'Tree', 'Vine'];
  private readonly _growthHabitEmitter$: BehaviorSubject<GrowthHabit> = new BehaviorSubject<GrowthHabit>('Any');

  public durations: Duration[] = ['Any', 'Annual', 'Perennial', 'Biennial'];
  private readonly _durationEmitter$: BehaviorSubject<Duration> = new BehaviorSubject<Duration>('Any');

  private _isSortOptionAlphabeticOrderEmitter$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  private readonly _searchDebounceTimeMs: number = 300;

  private static readonly _countyNameStateSeparator: string = ' - ';

  private get isSortOptionAlphabeticOrderEmitter$(): Observable<boolean> {
    return this._isSortOptionAlphabeticOrderEmitter$.asObservable();
  }
  private _sortOptionDirection: 'A-Z' | 'Z-A' = 'A-Z';
  public get sortOptionDirection(): 'A-Z' | 'Z-A' {
    return this._sortOptionDirection;
  }

  public toggleSortOptionDirection(): void {
    this._sortOptionDirection = this._sortOptionDirection == 'Z-A' ? 'A-Z' : 'Z-A';
    this._isSortOptionAlphabeticOrderEmitter$.next(this._sortOptionDirection === 'A-Z');
  }

  public sortOptions: SortOption[] = ['commonName', 'scientificName'];
  private readonly _sortOptionsEmitter$: BehaviorSubject<SortOption> = new BehaviorSubject<SortOption>('commonName');
  private get sortOptionsEmitter$(): Observable<SortOption> {
    return this._sortOptionsEmitter$.asObservable();
  }

  private readonly _destroy$: Subject<void> = new Subject<void>();
  @Output() public filterInProgress$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  @ViewChild('countiesDataList') public readonly countiesDataList!: ElementRef<HTMLDataListElement>;
  public readonly counties$: Observable<CountyCSVItem[]> = this._http.get<CountyCSVItem[]>('/api/counties').pipe(shareReplay({ bufferSize: 1, refCount: true }), takeUntil(this._destroy$));
  public trackCountyByCombinedFIP(county: CountyCSVItem): string {
    return combineCountyFIP(county);
  }

  public geolocationCountyName: string = '';

  private readonly _countyLookup$: Observable<Map<string, CountyCSVItem>> = this.counties$.pipe(
    take(1),
    map(counties => {
      const map = new Map<string, CountyCSVItem>();
      for (const c of counties) {
        map.set(
          this.getCountyAndStateAbbrev(c),
          c
        );
      }
      return map;
    }),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  private readonly _countyRenavigate$ = new Subject<string>();
  private readonly _validCountyRenavigate$: Observable<CountyCSVItem> =
    this._countyRenavigate$.pipe(
      withLatestFrom(this._countyLookup$),
      map(([countyKey, map]) => [countyKey, map.get(countyKey)] as [string, CountyCSVItem | undefined]),
      filter((pair): pair is [string, CountyCSVItem] => pair[1] !== undefined),
      tap(([countyKey]) => {
        const [countyName, stateAbbrev] = countyKey.split(PlantSearchComponent._countyNameStateSeparator);
        this._router.navigate([buildRoute(Route.searchRoute, { countyName, stateAbbrev })], {
          queryParamsHandling: 'merge'
        });
      }),
      map(([, county]) => county)
    );
  private readonly _searchStarter$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  private readonly _userSearchStarter$: Subject<string> = new Subject<string>();
  private get userSearchStarter$(): Observable<string> {
    return this._userSearchStarter$.pipe(debounceTime(this._searchDebounceTimeMs));
  }
  private readonly _search$: Observable<string> = merge(this.userSearchStarter$, this._searchStarter$).pipe(distinctUntilChanged(), takeUntil(this._destroy$));

  // Using a combineLatest to combine multiple state changes at once for filtering easy
  // TODO pass in batch size at some point?
  private readonly _fullyFilteredNativePlants: Observable<Readonly<PlantData>[]> = combineLatest([
    this._growthHabitEmitter$,
    this._durationEmitter$,
    this._positionService.countyEmitter$.pipe(map(val => combineCountyFIP(val))),
    this._search$,
    this.sortOptionsEmitter$,
    this.isSortOptionAlphabeticOrderEmitter$
  ]).pipe(
    switchMap(([growthHabit, duration, combinedFIP, searchString, sortOption, isSortAlphabeticOrder]: [GrowthHabit, Duration, string, string, SortOption, boolean]) => {
      this.filterInProgress$.next(true);
      return this._plantService.searchNativePlantsBatched(searchString, combinedFIP, growthHabit, duration, sortOption, isSortAlphabeticOrder);
    }),
    tap((plants: Readonly<PlantData>[]) => {
      this.filteredDataBatch.emit(plants);
      this.filterInProgress$.next(false);
    }),
    takeUntil(this._destroy$)
  );

  @Output() public filteredDataBatch: EventEmitter<ReadonlyArray<Readonly<PlantData>>> = new EventEmitter();

  public constructor(
    private readonly _plantService: GovPlantsDataService,
    private readonly _positionService: PositionService,
    private readonly _http: HttpClient,
    private readonly _title: Title,
    private readonly _meta: Meta,
    private readonly _activatedRoute: ActivatedRoute,
    private readonly _router: Router) {
    this._fullyFilteredNativePlants.subscribe();

    this._positionService.countyEmitter$
      .pipe(
        filter(Boolean),
        switchMap((county) =>
          this._activatedRoute.params.pipe(
            take(1),
            map((p) => p as Partial<Record<SearchRouteParam, string>>),
            filter((params) => !params.countyName || params.stateAbbrev?.length !== 2),
            map(() => county)
          )
        ),
        switchMap((x) => this._http.get<CountyCSVItem>(`/api/counties/${x.stateFip}/${x.countyFip}`)),
        takeUntil(this._destroy$))
      .subscribe((county) => {
        const combinedName = this.getCountyAndStateAbbrev(county);
        this.geolocationCountyName = combinedName;
        this._countyRenavigate$.next(combinedName);
      });

    this._activatedRoute.params.pipe(
      map((p) => p as Partial<Record<SearchRouteParam, string>>),
      filter((params) => !!params.countyName && params.stateAbbrev?.length === 2),
      switchMap((params) =>
        this._countyLookup$.pipe(
          take(1),
          map((countyMap) => countyMap.get(
            this.formatCountyAndStateAbbrev(params.countyName!, params.stateAbbrev!)
          ))
        )
      ),
      filter((county): county is CountyCSVItem => !!county),
      takeUntil(this._destroy$)
    ).subscribe((county) => {
      this.geolocationCountyName = this.getCountyAndStateAbbrev(county);
      this._positionService.manualCounty = county;
    });

    this._validCountyRenavigate$.pipe(
      takeUntil(this._destroy$)
    ).subscribe();

    this._title.setTitle('Native Plants in the US | What Grows Native Here');
    const tag = <MetaDefinition>{
      name: 'description',
      content: 'Find native plants for any county in the US. See each plant\'s native range and filter on characteristics. Native regions gathered from USDA Plants website.'
    };
    this._meta.updateTag(tag);
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  // TODO figure out use case when the plant is native to state but has no county data? do i just include all or none for now

  public search(searchValue: string): void {
    this._userSearchStarter$.next(searchValue);
  }

  public changeSortOption(option: string) {
    this._sortOptionsEmitter$.next(option as SortOption);
  }

  public changeGrowthHabit(habit: string) {
    this._growthHabitEmitter$.next(habit as GrowthHabit);
  }

  public changeDuration(duration: string) {
    this._durationEmitter$.next(duration as Duration);
  }

  public handleNameInput(name: string | null): void {
    if (name)
      this._countyRenavigate$.next(name);
  }

  public getCountyAndStateAbbrev(c: CountyCSVItem): string {
    return this.formatCountyAndStateAbbrev(c.countyName, c.stateAbbrev);
  }

  private formatCountyAndStateAbbrev(countyName: string, stateAbbrev: string) {
    return countyName + PlantSearchComponent._countyNameStateSeparator + stateAbbrev;
  }
}

