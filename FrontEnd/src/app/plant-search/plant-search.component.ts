import { Component, EventEmitter, Output, OnDestroy, ChangeDetectionStrategy, Signal, WritableSignal } from '@angular/core';
import { Color, combineCountyFIP, CountyCSVItem, Duration, GrowthHabit, Level, Lifespan, PlantData, Rate, ShadeTolerance, Toxicity } from '../models/gov/models';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { AsyncPipe, UpperCasePipe } from '@angular/common';
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
import { toObservable } from '@angular/core/rxjs-interop';

export type SortOption = keyof Pick<PlantData, 'commonName' | 'scientificName' | 'symbol'>;
export type FilterSelection = { key: string, value: string | boolean };

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
    IconComponent,
    AsyncPipe],
  templateUrl: './plant-search.component.html',
  styleUrl: './plant-search.component.css'
})
export class PlantSearchComponent implements OnDestroy {
  protected readonly colors: Color[] = ['Black', 'Blue', 'Brown', 'Green', 'Orange', 'Purple', 'Red', 'White', 'Yellow', 'Dark Green', 'Gray-Green', 'White-Gray', 'Yellow-Green']
  protected readonly toxicities: Toxicity[] = ['None', 'Slight', 'Moderate', 'Severe'];
  protected readonly growthHabits: GrowthHabit[] = ['Forb/herb', 'Graminoid', 'Nonvascular', 'Shrub', 'Subshrub', 'Tree', 'Vine'];
  protected readonly shadeTolerances: ShadeTolerance[] = ['Tolerant', 'Intermediate', 'Intolerant'];
  protected readonly lifespans: Lifespan[] = ['Short', 'Moderate', 'Long'];
  protected readonly durations: Duration[] = ['Annual', 'Perennial', 'Biennial'];
  protected readonly rates: Rate[] = ['None', 'Slow', 'Moderate', 'Rapid'];
  protected readonly booleans: boolean[] = [true, false];
  protected readonly levels: Level[] = ['None', 'Low', 'Medium', 'High'];

  protected readonly growthHabit = signal<GrowthHabit | undefined>(undefined);
  private readonly _growthHabit$ = toObservable(this.growthHabit);

  protected readonly duration = signal<Duration | undefined>(undefined);
  private readonly _duration$ = toObservable(this.duration);

  protected readonly toxicity = signal<Toxicity | undefined>(undefined);
  private readonly _toxicity$ = toObservable(this.toxicity);

  protected readonly flowerColor = signal<Color | undefined>(undefined);
  private readonly _flowerColor$ = toObservable(this.flowerColor);

  protected readonly foliageColor = signal<Color | undefined>(undefined);
  private readonly _foliageColor$ = toObservable(this.foliageColor);

  protected readonly shadeTolerance = signal<ShadeTolerance | undefined>(undefined);
  private readonly _shadeTolerance$ = toObservable(this.shadeTolerance);

  protected readonly lifespan = signal<Lifespan | undefined>(undefined);
  private readonly _lifespan$ = toObservable(this.lifespan);

  protected readonly growthRate = signal<Rate | undefined>(undefined);
  private readonly _growthRate$ = toObservable(this.growthRate);

  protected readonly humanPalatable = signal<boolean | undefined>(undefined);
  private readonly _humanPalatable$ = toObservable(this.humanPalatable);

  protected readonly droughtTolerance = signal<Level | undefined>(undefined);
  private readonly _droughtTolerance$ = toObservable(this.droughtTolerance);
  

  private _isSortOptionAlphabeticOrderEmitter$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  private readonly _searchDebounceTimeMs: number = 300;

  private get isSortOptionAlphabeticOrderEmitter$(): Observable<boolean> {
    return this._isSortOptionAlphabeticOrderEmitter$.asObservable();
  }

  protected sortOptionDirection = signal('A-Z');

  protected toggleSortOptionDirection(): void {
    this.sortOptionDirection.update((val) => val == 'Z-A' ? 'A-Z' : 'Z-A');
    this._isSortOptionAlphabeticOrderEmitter$.next(this.sortOptionDirection() === 'A-Z');
  }

  protected sortOptions: SortOption[] = ['commonName', 'scientificName'];
  protected readonly sortOptionsEmitter$: BehaviorSubject<SortOption> = new BehaviorSubject<SortOption>('commonName');

  private readonly _destroy$: Subject<void> = new Subject<void>();

  @Output() public filterInProgress$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  protected get counties$(): Observable<CountyCSVItem[]> { return this.countyService.counties$; }
  protected get countiesSignal(): Signal<CountyCSVItem[] | undefined> { return this.countyService.countiesSignal; }
  protected trackCountyByCombinedFIP(county: CountyCSVItem): string { return this.countyService.trackCountyByCombinedFIP(county); }

  protected geolocationCountyNewQuery = signal('');
  protected filteredCounties = computed(() => {
    const query = this.geolocationCountyNewQuery().toLowerCase();
    return this.countiesSignal()?.filter((county) => `${county.countyName} - ${county.stateAbbrev}`.toLowerCase()
      .includes(query));
  });

  protected readonly listbox = viewChild<Listbox<string>>(Listbox);
  protected readonly options = viewChildren<Option<string>>(Option);
  protected readonly combobox = viewChild<Combobox<string>>(Combobox);
  protected readonly filterMenu = viewChild<Menu<string | Duration>>('filterMenu');
  protected readonly durationMenu = viewChild<Menu<string>>('durationMenu');
  protected readonly growthHabitMenu = viewChild<Menu<string>>('growthHabitMenu');
  protected readonly sortMenu = viewChild<Menu<string>>('sortMenu');
  protected readonly toxicityMenu = viewChild<Menu<string>>('toxicityMenu');
  protected readonly flowerColorMenu = viewChild<Menu<string>>('flowerColorMenu');
  protected readonly foliageColorMenu = viewChild<Menu<string>>('foliageColorMenu');
  protected readonly shadeToleranceMenu = viewChild<Menu<string>>('shadeToleranceMenu');
  protected readonly lifespanMenu = viewChild<Menu<string>>('lifespanMenu');
  protected readonly growthRateMenu = viewChild<Menu<string>>('growthRateMenu');
  protected readonly humanPalatableMenu = viewChild<Menu<string>>('humanPalatableMenu');
  protected readonly droughtToleranceMenu = viewChild<Menu<string>>('droughtToleranceMenu');

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
    this._growthHabit$,
    this._duration$,
    this._positionService.countyEmitter$.pipe(map(val => combineCountyFIP(val))),
    this._search$,
    this._toxicity$,
    this._flowerColor$,
    this._foliageColor$,
    this._shadeTolerance$,
    this._lifespan$,
    this._growthRate$,
    this._humanPalatable$,
    this._droughtTolerance$,
    this.sortOptionsEmitter$,
    this.isSortOptionAlphabeticOrderEmitter$
  ]).pipe(
    distinctUntilChanged((a, b) => a.every((v, i) => v === b[i])),
    switchMap(([growthHabit, duration, combinedFIP, searchString, toxicity, flowerColor, foliageColor, shadeTolerance, lifespan, growthRate, humanPalatable, droughtTolerance, sortOption, isSortAlphabeticOrder]:
      [GrowthHabit | undefined, Duration | undefined, string, string, Toxicity | undefined, Color | undefined, Color | undefined, ShadeTolerance | undefined, Lifespan | undefined, Rate | undefined, boolean | undefined, Level | undefined, SortOption, boolean]): Observable<Readonly<PlantData>[]> => {
      this.filterInProgress$.next(true);
      return this._plantService.searchNativePlantsBatched(searchString, combinedFIP, growthHabit, duration, toxicity, flowerColor, foliageColor, shadeTolerance, lifespan, growthRate, humanPalatable, droughtTolerance, sortOption, isSortAlphabeticOrder)
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
    this.sortOptionsEmitter$.next(option as SortOption);
  }

  private isSortOption(value: string): value is SortOption {
    return this.sortOptions.includes(value as SortOption);
  }

  protected getFilterItem(key: string, value: string | boolean): FilterSelection { return <FilterSelection>{ key, value }; }

  protected onFilterItemSelected(item: FilterSelection): void {
    console.log(item);
    if (item.key == 'duration') {
      this.duration.update(signalUpdate(item.value as Duration));
    }
    else if (item.key == 'growthHabit') {
      this.growthHabit.update(signalUpdate(item.value as GrowthHabit));
    }
    else if (item.key == 'toxicity') {
      this.toxicity.update(signalUpdate(item.value as Toxicity));
    }
    else if (item.key == 'flowerColor') {
      this.flowerColor.update(signalUpdate(item.value as Color));
    }
    else if (item.key == 'foliageColor') {
      this.foliageColor.update(signalUpdate(item.value as Color));
    }
    else if (item.key == 'shadeTolerance') {
      this.shadeTolerance.update(signalUpdate(item.value as ShadeTolerance));
    }
    else if (item.key == 'lifespan') {
      this.lifespan.update(signalUpdate(item.value as Lifespan));
    }
    else if (item.key == 'growthRate') {
      this.growthRate.update(signalUpdate(item.value as Rate));
    }
    else if (item.key == 'humanPalatable') {
      this.humanPalatable.update(signalUpdate(item.value as boolean));
    }
    else if(item.key === 'droughtTolerance'){
      this.droughtTolerance.update(signalUpdate(item.value as Level));
    }

    function signalUpdate<T>(newVal: T): (value: T | undefined) => T | undefined {
      return (val) => val === newVal ? undefined : newVal;
    }
  }

  public onSortItemSelected(value: string) {
    if (this.isSortOption(value)) {
      this.changeSortOption(value);
    }
    else {
      this.toggleSortOptionDirection();
    }
  }

  private readonly filterSignals: WritableSignal<unknown | undefined>[] = [this.growthHabit, this.duration, this.toxicity, this.flowerColor, this.foliageColor, this.shadeTolerance, 
    this.lifespan, this.growthRate, this.humanPalatable, this.droughtTolerance];
    
  public clearFilters(): void {
    this.filterSignals.forEach(signal => signal.set(undefined));
  }
  
  public anyActiveFilters(): boolean { return this.filterSignals.some((x) => x() !== undefined)}

  public handleNameInput(name: string | undefined): void {
    if (name) this._countyRenavigate$.next(name);
  }
}