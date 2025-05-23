import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, OperatorFunction, expand, map, reduce, takeWhile, tap } from 'rxjs';
import { GBIFPageableResult } from '../models/gbif/gbif.pageable-result';
import { GbifOccurrence } from '../models/gbif/gbif.occurrence';
import { NativePlantSearch } from '../interfaces/native-plant-search.interface';
import { GBIFGADMRegion } from '../models/gbif/gbif.gadm-region';
import { GBIFPage } from '../models/gbif/gbif.page';

@Injectable({
  providedIn: 'root'
})
export class GbifService implements NativePlantSearch {

  private _url: string = 'https://api.gbif.org/';
  private _v2Url: string = `${this._url}v2/`;
  private _v1Url: string = `${this._url}v1/`;
  private _nativeKeyword: string = 'native';
  private _plantKingdomKey: number = 6;
  private _uncertaintyRangeMeters: number = 1 * 1000; // 1Km
  private _earthRadiusMeters: number = 6371 * 1000;
  private _USA_TOP_GADM_REGION: string = 'USA';
  private _US_COUNTRY_ENUM: string = 'US';
  private _GADMSubdivisionLimit: number = 2;


  private readonly NATURALIZED_NON_NATIVE_SPECIES: string[] = ['Agrostis stolonifera', 'Ricinus communis'];
  // TODO cal-ipc can be used to filter out invasive california plants for california queries

  private readonly UNFORGIVEABLE_ERRORS: string[] = [];

  private readonly _resultsPerPage = 300;

  constructor(private _client: HttpClient) { }

  public getScientificName(commonName: string): Observable<string> {
    return this._client.get<string>(`${this._v1Url}species/match`, {
      params: {
        name: commonName
      }
    });
  }

  public searchLiterature(taxonKey: number): Observable<any> {
    return this._client.get<any>(`${this._v1Url}literature/search`, {
      params: {
        countriesOfCoverage: this._US_COUNTRY_ENUM,
        gbifTaxonKey: taxonKey
      }
    })
  }

  public isNativeSpecies(speciesKey: number): Observable<boolean> {

    throw new Error('Method not implemented.');
  }

  /**
   * Gets {@link GBIFGADMRegion  | GBIFGADMRegions} for every state in the US including DC
   * e.g. id: USA.1_1 - USA.51_1
   * 1_1 is alabama , its alphabetic
   * @returns 
   */
  public getUSAStateRegions(): Observable<GBIFGADMRegion[]> {
    return this.searchGADMSubregions(this._USA_TOP_GADM_REGION, '', 1);
  }

  /**
   * 
   * @returns 
   */
  public getUSAStateCounties(stateNumber: number): Observable<GBIFGADMRegion[]> {
    this.throwIfInvalidState(stateNumber);
    const id = `${this._USA_TOP_GADM_REGION}.${stateNumber}_1`;
    return this.searchGADMSubregions(id);
  }

  private throwIfInvalidState(stateNumber: number): void {
    if (stateNumber < 1)
      throw new Error('Below possible value');
    if (stateNumber > 51)
      throw new Error('above possible value');
  }

  /// Not useful, county is smallest region ive observed consistently
  // public getUSACountySubregions(stateNumber: number, countyNumber: number){
  //   this.throwIfInvalidState(stateNumber);
  //   const id = `${this._USA_TOP_GADM_REGION}.${stateNumber}.${countyNumber}_1`;
  //   return this.searchGADMSubregions(id);
  // }

  private searchGADMSubregions(gadmGid: string, q: string = '', gadmLevel: number = this._GADMSubdivisionLimit): Observable<GBIFGADMRegion[]> {
    let pageParams = this.GetMaxPageParams();
    return this.aggregatePageableResults<GBIFGADMRegion>(
      pageParams,
      (_) => true,
      (params) => this.searchGADMRegions(q, gadmGid, params, gadmLevel.toString())
    );
  }

  private searchGADMRegions(q: string, gadmGid: string, page: GBIFPage, gadmLevel: string): Observable<GBIFPageableResult<GBIFGADMRegion>> {
    return this._client.get<GBIFPageableResult<GBIFGADMRegion>>(`${this._v1Url}geocode/gadm/search`, {
      params: {
        q: q,
        gadmGid: gadmGid,
        gadmLevel: gadmLevel,
        limit: page.limit,
        offset: page.offset
      },
    });
  }

  private createCirclePolygon(lat: number, lon: number, radius: number = this._uncertaintyRangeMeters, numPoints: number = 8): string {
    const coords: string[] = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (2 * Math.PI * i) / numPoints;

      // Latitude: 1 deg ≈ 111,320 meters
      const offsetLat = (radius * Math.cos(angle)) / this._earthRadiusMeters;
      const offsetLon = (radius * Math.sin(angle)) / (this._earthRadiusMeters * Math.cos(lat * Math.PI / 180));

      const pointLat = lat + (offsetLat * 180) / Math.PI;
      const pointLon = lon + (offsetLon * 180) / Math.PI;

      coords.push(`${pointLon} ${pointLat}`);
    }

    // Close the polygon by repeating the first point
    coords.push(coords[0]);

    // if (this.isClockwise(coords))
    coords.reverse();

    const polygon: string = `POLYGON ((${coords.join(', ')}))`;
    console.log(polygon);
    return polygon;
  }

  /**
   * My mind cant figure this out but its working rn
   * its native if its not on the {@link NATURALIZED_NON_NATIVE_SPECIES} 
   * and its {@link occurrence.taxonomicStatus} is accepted
   * and theres no unforgivable issues
   * @param occurrence 
   * @returns 
   */
  private isNative(occurrence: GbifOccurrence): boolean {
    const species = occurrence.species?.trim();
    const status = occurrence.taxonomicStatus;
    const issues = occurrence.issues || [];

    const isInNonNativeList = this.NATURALIZED_NON_NATIVE_SPECIES.includes(species);
    const hasUnforgivableIssues = issues.some(issue =>
      this.UNFORGIVEABLE_ERRORS.includes(issue)
    );

    const isAccepted = status === 'ACCEPTED';
    const isNative = !isInNonNativeList && isAccepted && !hasUnforgivableIssues;

    return isNative;
  }

  private createNativePlantSearchRequest(params: { country: string; geometry: string; limit: number; taxonKey: string; hasGeospatialIssue: boolean; hasCoordinate: boolean; offset: number; }): Observable<GBIFPageableResult<GbifOccurrence>> {
    return this._client.get<GBIFPageableResult<GbifOccurrence>>(`${this._v1Url}occurrence/search`, {
      params: params
    });
  }

  public searchNativePlants(latitude: number, longitude: number): Observable<GbifOccurrence[]> {
    const staticParams = {
      country: 'US',
      geometry: this.createCirclePolygon(latitude, longitude),
      taxonKey: this._plantKingdomKey.toString(),
      hasGeospatialIssue: false,
      hasCoordinate: true,
    };

    let pageParams = this.GetMaxPageParams();

    return this.aggregatePageableResults<GbifOccurrence>(
      pageParams,
      (item) => this.isNative(item),
      (params) => this.createNativePlantSearchRequest({ ...staticParams, ...params })
    );

    // TODO filter out naturalized plants 
  }

  private GetMaxPageParams(): GBIFPage {
    return {
      limit: this._resultsPerPage,
      offset: 0
    };
  }

  /**
   * Aggregates all pageable results possible to retrieve into a single list
   * @param params 
   * @param filterPredicate 
   * @param requestFn 
   * @returns 
   */
  private aggregatePageableResults<T>(
    params: GBIFPage,
    filterPredicate: (item: T) => boolean,
    requestFn: (params: GBIFPage) => Observable<GBIFPageableResult<T>>): Observable<T[]> {
    return (requestFn(params)).pipe(
      expand(() => {
        params.offset += params.limit;
        return requestFn(params);
      }),
      takeWhile((record: GBIFPageableResult<T>) => !record.endOfRecords && params.offset != 9900, true), // HACK
      tap(value => console.log('offset: ' + value.offset, 'total: ' + value.count)),
      GbifService.filterPageResults(value => filterPredicate(value)),
      reduce((acc, record) => {
        acc.push(...record.results);
        return acc;
      }, [] as T[]));
  }

  private static filterPageResults<T>(
    predicate: (item: T) => boolean
  ): OperatorFunction<GBIFPageableResult<T>, GBIFPageableResult<T>> {
    return (source) =>
      source.pipe(
        map(page => ({
          ...page,
          results: page.results.filter(predicate),
        }))
      );
  }
}
