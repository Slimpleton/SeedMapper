import { Component, EventEmitter, Output, OnDestroy, ChangeDetectionStrategy, Signal, OutputRefSubscription } from '@angular/core';
import { Color, combineCountyFIP, CountyCSVItem, Duration, GrowthHabit, PlantData, Toxicity } from '../models/gov/models';
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
export type FilterSelection = { key: string, value: string };

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
  protected colors: Color[] = ['Black' , 'Blue' , 'Brown' , 'Green' , 'Orange' , 'Purple' , 'Red' , 'White' , 'Yellow' , 'Dark Green' , 'Gray-Green' , 'White-Gray' , 'Yellow-Green']
  protected toxicities: Toxicity[] = ['None', 'Slight', 'Moderate', 'Severe'];
  protected growthHabits: GrowthHabit[] = ['Forb/herb', 'Graminoid', 'Nonvascular', 'Shrub', 'Subshrub', 'Tree', 'Vine'];
  protected readonly growthHabitEmitter$: BehaviorSubject<GrowthHabit> = new BehaviorSubject<GrowthHabit>('Any');

  protected durations: Duration[] = ['Annual', 'Perennial', 'Biennial'];
  protected readonly durationEmitter$: BehaviorSubject<Duration> = new BehaviorSubject<Duration>('Any');
  protected readonly toxicity = signal<Toxicity | undefined>(undefined);
  private readonly _toxicity$ = toObservable(this.toxicity);

  protected readonly flowerColor = signal<Color | undefined>(undefined);
  private readonly _flowerColor$ = toObservable(this.flowerColor);

  private _isSortOptionAlphabeticOrderEmitter$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  private readonly _searchDebounceTimeMs: number = 300;
  private _durationMenuSub: OutputRefSubscription | undefined;
  private _growthHabitMenuSub: OutputRefSubscription | undefined;

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
    this.growthHabitEmitter$,
    this.durationEmitter$,
    this._positionService.countyEmitter$.pipe(map(val => combineCountyFIP(val))),
    this._search$,
    this._toxicity$,
    this._flowerColor$,
    this.sortOptionsEmitter$,
    this.isSortOptionAlphabeticOrderEmitter$
  ]).pipe(
    distinctUntilChanged((a, b) => a.every((v, i) => v === b[i])),
    switchMap(([growthHabit, duration, combinedFIP, searchString, toxicity, flowerColor, sortOption, isSortAlphabeticOrder]: 
      [GrowthHabit, Duration, string, string, Toxicity | undefined, Color | undefined, SortOption, boolean]): Observable<Readonly<PlantData>[]> => {
      this.filterInProgress$.next(true);
      return this._plantService.searchNativePlantsBatched(searchString, combinedFIP, growthHabit, duration, toxicity, flowerColor, sortOption, isSortAlphabeticOrder)
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
    this._durationMenuSub?.unsubscribe();
    this._growthHabitMenuSub?.unsubscribe();
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

  protected getFilterItem(key: string, value: string): FilterSelection { return <FilterSelection>{ key, value }; }

  protected onFilterItemSelected(item: FilterSelection): void {
    if (item.key == 'duration')
      this.changeDuration(item.value);
    else if (item.key == 'growthHabit') {
      this.changeGrowthHabit(item.value);
    }
    else if (item.key == 'toxicity') {
      this.toxicity.set(item.value as Toxicity);
    }
    else if (item.key == 'flowerColor'){
      this.flowerColor.set(item.value as Color);
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

  
  private readonly filterSignals = [this.toxicity, this.flowerColor];
  public clearFilters(): void {
    this.changeDuration('Any');
    this.changeGrowthHabit('Any');
    this.filterSignals.forEach(signal => {
      signal.set(undefined);
    });
  }

  public changeGrowthHabit(habit: string): void {
    this.growthHabitEmitter$.next(habit as GrowthHabit);
  }

  public changeDuration(duration: string): void {
    console.log(duration);
    this.durationEmitter$.next(duration as Duration);
  }

  public handleNameInput(name: string | undefined): void {
    if (name) this._countyRenavigate$.next(name);
  }

}