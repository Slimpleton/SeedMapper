import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, OperatorFunction, concatMap, expand, filter, iif, map, mergeAll, reduce, takeWhile, tap } from 'rxjs';
import { GBIFPageableResult } from '../models/gbif.pageable-result';
import { GbifOccurrence, isAcceptedStatus } from '../models/gbif.occurrence';
import { NativePlantSearch } from '../interfaces/native-plant-search.interface';
import { GBIFGADMRegion } from '../models/gbif.gadm-region';
import { GBIFPage } from '../models/gbif.page';

@Injectable({
  providedIn: 'root'
})
export class GbifService implements NativePlantSearch {
  private _url: string = 'https://api.gbif.org/';
  private _v2Url: string = `${this._url}v2/`;
  private _v1Url: string = `${this._url}v1/`;
  private _nativeKeyword: string = 'native';
  private _plantKingdomKey: number = 6;
  private _uncertaintyRangeMeters: number = 25 * 1000; // 25Km
  private _earthRadiusMeters: number = 6371 * 1000;
  private _USA_TOP_GADM_REGION: string = 'USA';
  private _GADMSubdivisionLimit: number = 2;


  private readonly NATURALIZED_NON_NATIVE_SPECIES: string[] = ['Agrostis stolonifera'];
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

  private isNotNative(occurrence: GbifOccurrence): boolean {
    let native: boolean = true;
    native &&= !this.NATURALIZED_NON_NATIVE_SPECIES.includes(occurrence.species);
    native &&= isAcceptedStatus(occurrence.taxonomicStatus);
    // native &&= !occurrence.establishmentMeans || occurrence.establishmentMeans == this._nativeKeyword; 
    if (occurrence.issues) {
      native &&= !occurrence.issues?.some(x => this.UNFORGIVEABLE_ERRORS.includes(x));
    }

    return native;
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
      (item) => !this.isNotNative(item),
      (params) => this.createNativePlantSearchRequest({ ...staticParams, ...params })
    );

    // TODO filter out naturalized plants 
    // return this.createRecordRequest(staticParams).pipe(
    //   expand(() => {
    //     staticParams.offset += staticParams.limit;
    //     return this.createRecordRequest(staticParams);
    //   }),
    //   takeWhile((record: GBIFPageableResult<GbifOccurrence>) => !record.endOfRecords, true),
    //   // tap(value => console.log('before manual filter', value, [...value.results])),
    //   tap(value => console.log('offset: ' + value.offset, 'total: ' + value.count)),
    //   this.filterPageResults(value => !this.isNotNative(value)),
    //   reduce((acc, record) => {
    //     acc.push(...record.results);
    //     return acc;
    //   }, [] as GbifOccurrence[])
    // );
  }

  private GetMaxPageParams(): GBIFPage {
    return {
      limit: this._resultsPerPage,
      offset: 0
    };
  }

  private aggregatePageableResults<T>(
    params: GBIFPage,
    filterPredicate: (item: T) => boolean,
    requestFn: (params: GBIFPage) => Observable<GBIFPageableResult<T>>): Observable<T[]> {
    return (requestFn(params)).pipe(
      expand(() => {
        params.offset += params.limit;
        return requestFn(params);
      }),
      takeWhile((record: GBIFPageableResult<T>) => !record.endOfRecords, true),
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
