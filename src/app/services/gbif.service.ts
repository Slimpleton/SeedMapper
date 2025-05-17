import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, concatMap, filter, iif, map, mergeAll, tap } from 'rxjs';
import { GBIFPageableResult } from '../models/gbif.pageable-result';
import { GbifOccurrence, isAcceptedStatus } from '../models/gbif.occurrence';

@Injectable({
  providedIn: 'root'
})
export class GbifService {
  private _url: string = 'https://api.gbif.org/';
  private _v2Url: string = `${this._url}v2/`;
  private _v1Url: string = `${this._url}v1/`;
  private _nativeKeyword: string = 'native';
  private _plantKingdomKey: number = 6;
  private _uncertaintyRangeMeters: number = 25 * 1000; // 25Km
  private _earthRadiusMeters = 6371 * 1000;


  private readonly NATURALIZED_NON_NATIVE_SPECIES: string[] = ['Agrostis stolonifera'];
  private readonly UNFORGIVEABLE_ERRORS: string[] = [];

  constructor(private _client: HttpClient) { }

  public getScientificName(commonName: string): Observable<string> {
    return this._client.get<string>(`${this._v1Url}species/match`, {
      params: {
        name: commonName
      }
    });
  }

  // Helper function to check if polygon is clockwise
  private isClockwise(coords: string[]): boolean {
    let sum = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const [x1, y1] = coords[i].split(' ').map(parseFloat);
      const [x2, y2] = coords[i + 1].split(' ').map(parseFloat);
      sum += (x2 - x1) * (y2 + y1);
    }
    return sum > 0;
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
    //TODO since we arent using this at the query level, we need to doubly ensure that its native and establishmentMeans doesnt exist on GbifOccurrence

    // Yes, **GBIF provides an endpoint that includes `establishmentMeans`**, but **only if the dataset or record includes it**. There’s no central endpoint that gives you a guaranteed native status **per species across regions**—but you can **infer it using the `species/{taxonKey}/distributions` endpoint**.

    // ---

    // ### ✅ Option 1: Use `/species/{taxonKey}/distributions`

    // This endpoint provides distribution records, and **includes `establishmentMeans`** for a species across countries or regions, if available.

    // **Example request:**

    // ```
    // GET https://api.gbif.org/v1/species/KEY/distributions
    // ```

    // Replace `KEY` with the species' `taxonKey`.

    // **Response includes:**

    // ```json
    // {
    //   "source": "USDA PLANTS Database",
    //   "locality": "United States",
    //   "establishmentMeans": "NATIVE",
    //   "occurrenceStatus": "PRESENT"
    // }
    // ```

    // This will tell you whether GBIF considers it **native**, **introduced**, or **endemic** in a specific location like the US.

    // ---

    // ### ✅ Option 2: Query occurrences with filters

    // You can continue using the `/occurrence/search` endpoint, but you’d need to **aggregate over results** and filter those that do contain `establishmentMeans = native`. Many records do include it, but **coverage is spotty**.

    // Example:

    // ```
    // https://api.gbif.org/v1/occurrence/search?taxonKey=3188978&country=US
    // ```

    // Check the records manually or programmatically to see if any of them have:

    // ```json
    // "establishmentMeans": "NATIVE"
    // ```

    // ---

    // ### 🚧 Limitations

    // * `establishmentMeans` isn't always present.
    // * Even in the distribution data, it's **region-specific** and may only be listed for some countries.
    // * You may need to **fallback to other sources**, such as USDA PLANTS or POWO (Plants of the World Online), for regional nativity.

    // ---

    // ### ✅ Practical Suggestion

    // You could write a fallback method:

    // 1. Try `species/{taxonKey}/distributions` for nativity by region.
    // 2. If missing, query `/occurrence/search` and aggregate any `establishmentMeans`.
    // 3. If still unknown, optionally use third-party data (e.g. USDA PLANTS, Calflora, POWO).

    // Want help writing that logic in TypeScript or Angular?



    if (occurrence.issues) {
      native &&= !occurrence.issues?.some(x => this.UNFORGIVEABLE_ERRORS.includes(x));
    }

    return native;
  }

  public searchNativePlants(latitude: number, longitude: number): Observable<GBIFPageableResult<GbifOccurrence>> {
    let params = {
      country: 'US',
      geometry: this.createCirclePolygon(latitude, longitude),
      limit: 300,
      taxonKey: this._plantKingdomKey,
      hasGeospatialIssue: 'false',
      hasCoordinate: 'true'
      // TODO offset: to get next page
    };

    const request = this._client.get<GBIFPageableResult<GbifOccurrence>>(`${this._v1Url}occurrence/search`, {
      params: params
    });

    // TODO filter out naturalized plants 
    return request.pipe(
      tap(value => console.log('before manual filter', value, [...value.results])),
      map((record: GBIFPageableResult<GbifOccurrence>) => {
        record.results = record.results.filter(occurrence => !this.isNotNative(occurrence));
        return record;
      }),
      // map((record: GBIFPageableResult<GbifOccurrence>) => this.removeFromResults(record, ))
    );
  }
}
