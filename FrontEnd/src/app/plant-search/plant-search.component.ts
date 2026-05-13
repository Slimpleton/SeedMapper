import { Component, EventEmitter, Output, OnDestroy, ChangeDetectionStrategy, Signal } from '@angular/core';
import { combineCountyFIP, CountyCSVItem, Duration, GrowthHabit, PlantData } from '../models/gov/models';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { UpperCasePipe } from '@angular/common';
import { Observable } from 'rxjs/internal/Observable';
import { GovPlantsDataService } from '../services/PLANTS_data.service';
import { PositionService } from '../services/position.service';
import { CountyService } from '../services/county.service';
import { TranslocoPipe } from '@jsverse/transloco';
import { debounceTime, distinctUntilChanged, map, tap, switchMap, takeUntil, filter, take, withLatestFrom, finalize, startWith } from 'rxjs/operators';
import { combineLatest, Subject } from 'rxjs';
import { Meta, MetaDefinition, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { buildRoute, Route, SearchRouteParam } from '../app.routes';
import { Combobox, ComboboxInput, ComboboxPopupContainer } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { OverlayModule } from '@angular/cdk/overlay';
import { FormsModule } from '@angular/forms';
import {
  afterRenderEffect,
  computed,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@angular/aria/menu';
import { IconComponent } from '../icon/icon.component';

export type SortOption = keyof Pick<PlantData, 'commonName' | 'scientificName' | 'symbol'>;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'plant-search',
  imports: [TranslocoPipe, UpperCasePipe,
    Combobox,
    ComboboxInput,
    ComboboxPopupContainer,
    Listbox,
    Option,
    OverlayModule,
    FormsModule,
    Menu,
    MenuContent,
    MenuItem,
    MenuTrigger,
    IconComponent],
  templateUrl: './plant-search.component.html',
  styleUrl: './plant-search.component.css'
})
export class PlantSearchComponent implements OnDestroy {
  public growthHabits: GrowthHabit[] = ['Forb/herb', 'Graminoid', 'Nonvascular', 'Shrub', 'Subshrub', 'Tree', 'Vine'];
  private readonly _growthHabitEmitter$: BehaviorSubject<GrowthHabit> = new BehaviorSubject<GrowthHabit>('Any');

  public durations: Duration[] = ['Annual', 'Perennial', 'Biennial'];
  private readonly _durationEmitter$: BehaviorSubject<Duration> = new BehaviorSubject<Duration>('Any');

  private _isSortOptionAlphabeticOrderEmitter$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  private readonly _searchDebounceTimeMs: number = 300;

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

  // Delegated to CountyService — survives navigation and SSR hydration
  public get counties$(): Observable<CountyCSVItem[]> { return this.countyService.counties$; }
  public get countiesSignal(): Signal<CountyCSVItem[] | undefined> { return this.countyService.countiesSignal; }
  public trackCountyByCombinedFIP(county: CountyCSVItem): string { return this.countyService.trackCountyByCombinedFIP(county); }

  public geolocationCountyNewQuery = signal('');
  public filteredCounties = computed(() => {
    const query = this.geolocationCountyNewQuery().toLowerCase();
    return this.countiesSignal()?.filter((county) => `${county.countyName} - ${county.stateAbbrev}`.toLowerCase()
      .includes(query));
  });

  protected readonly listbox = viewChild<Listbox<string>>(Listbox);
  protected readonly options = viewChildren<Option<string>>(Option);
  protected readonly combobox = viewChild<Combobox<string>>(Combobox);
  protected filterMenu = viewChild<Menu<string | Duration>>('filterMenu');
  protected durationMenu = viewChild<Menu<string>>('durationMenu');
  protected growthHabitMenu = viewChild<Menu<string>>('growthHabitMenu');


  private readonly _countyRenavigate$ = new Subject<string>();
  private readonly _validCountyRenavigate$: Observable<CountyCSVItem> =
    this._countyRenavigate$.pipe(
      withLatestFrom(this.countyService.countyLookup$),
      map(([countyKey, map]) => [countyKey, map.get(countyKey)] as [string, CountyCSVItem | undefined]),
      filter((pair): pair is [string, CountyCSVItem] => pair[1] !== undefined),
      tap(([countyKey]) => {
        const [countyName, stateAbbrev] = countyKey.split(' - ');
        this._router.navigate([buildRoute(Route.searchRoute, { countyName, stateAbbrev })], {
          queryParamsHandling: 'merge'
        });
      }),
      map(([, county]) => county)
    );

  private readonly _userSearchStarter$: Subject<string> = new Subject<string>();

  private readonly _search$: Observable<string> = this._userSearchStarter$.pipe(
    debounceTime(this._searchDebounceTimeMs),
    startWith(''),
    distinctUntilChanged(),
    takeUntil(this._destroy$)
  );

  private readonly _fullyFilteredNativePlants: Observable<Readonly<PlantData>[]> = combineLatest([
    this._growthHabitEmitter$,
    this._durationEmitter$,
    this._positionService.countyEmitter$.pipe(map(val => combineCountyFIP(val))),
    this._search$,
    this.sortOptionsEmitter$,
    this.isSortOptionAlphabeticOrderEmitter$
  ]).pipe(
    distinctUntilChanged((a, b) => a.every((v, i) => v === b[i])),
    switchMap(([growthHabit, duration, combinedFIP, searchString, sortOption, isSortAlphabeticOrder]: [GrowthHabit, Duration, string, string, SortOption, boolean]): Observable<Readonly<PlantData>[]> => {
      this.filterInProgress$.next(true);
      return this._plantService.searchNativePlantsBatched(searchString, combinedFIP, growthHabit, duration, sortOption, isSortAlphabeticOrder)
        .pipe(finalize(() => { this.filterInProgress$.next(false); }));
    }),
    takeUntil(this._destroy$)
  );

  @Output() public filteredDataBatch: EventEmitter<ReadonlyArray<Readonly<PlantData>>> = new EventEmitter();

  public constructor(
    private readonly _plantService: GovPlantsDataService,
    private readonly _positionService: PositionService,
    protected readonly countyService: CountyService,
    private readonly _title: Title,
    private readonly _meta: Meta,
    private readonly _activatedRoute: ActivatedRoute,
    private readonly _router: Router) {

    afterRenderEffect(() => {
      const option = this.options().find((opt) => opt.active());
      setTimeout(() => option?.element.scrollIntoView({ block: 'nearest' }), 50);
    });
    // Resets the listbox scroll position when the combobox is closed.
    afterRenderEffect(() => {
      if (!this.combobox()?.expanded()) {
        setTimeout(() => this.listbox()?.element.scrollTo(0, 0), 150);
      }
    });

    afterRenderEffect(() => {
      if (!this.combobox()?.expanded()) {
        const values = this.listbox()?.values();
        if (values?.length) {
          this.handleNameInput(values[0]);
        }
      }
    });

    this._fullyFilteredNativePlants.subscribe((plants) => this.filteredDataBatch.emit(plants));

    this._positionService.countyEmitter$
      .pipe(
        filter(Boolean),
        distinctUntilChanged((a, b) => combineCountyFIP(a) === combineCountyFIP(b)),
        switchMap((county) =>
          this._activatedRoute.params.pipe(
            take(1),
            map((p) => p as Partial<Record<SearchRouteParam, string>>),
            filter((params) => !params.countyName || params.stateAbbrev?.length !== 2),
            map(() => county)
          )
        ),
        switchMap((x) => this.countyService.getCountyByFip(x.stateFip, x.countyFip)),
        takeUntil(this._destroy$)
      )
      .subscribe((county) => {
        const combinedName = this.countyService.getCountyAndStateAbbrev(county);
        this.geolocationCountyNewQuery.set(combinedName);
        this._countyRenavigate$.next(combinedName);
      });

    this._activatedRoute.params.pipe(
      map((p) => p as Partial<Record<SearchRouteParam, string>>),
      filter((params) => !!params.countyName && params.stateAbbrev?.length === 2),
      switchMap((params) =>
        this.countyService.countyLookup$.pipe(
          take(1),
          map((countyMap) => countyMap.get(
            this.countyService.formatCountyAndStateAbbrev(params.countyName!, params.stateAbbrev!)
          ))
        )
      ),
      filter((county): county is CountyCSVItem => !!county),
      takeUntil(this._destroy$)
    ).subscribe((county) => {
      this.geolocationCountyNewQuery.set(this.countyService.getCountyAndStateAbbrev(county));
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

  public ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  public search(searchValue: string): void {
    this._userSearchStarter$.next(searchValue);
  }

  public changeSortOption(option: string): void {
    this._sortOptionsEmitter$.next(option as SortOption);
  }

  public changeGrowthHabit(habit: string): void {
    this._growthHabitEmitter$.next(habit as GrowthHabit);
  }

  public changeDuration(duration: string): void {
    console.log(duration);
    this._durationEmitter$.next(duration as Duration);
  }

  public handleNameInput(name: string | undefined): void {
    if (name) this._countyRenavigate$.next(name);
  }

}