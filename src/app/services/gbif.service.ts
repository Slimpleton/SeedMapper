import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, iif, switchMap, tap } from 'rxjs';
import { GBIFPageableResult } from '../models/gbif.pageable-result';
import { GbifOccurrence } from '../models/gbif.occurrence';

@Injectable({
  providedIn: 'root'
})
export class GbifService {
  private _url: string = 'https://api.gbif.org/';
  private _v2Url: string = `${this._url}v2/`;
  private _v1Url: string = `${this._url}v1/`;
  private _nativeKeyword: string = 'native';
  private _plantKingdomKey: number = 6;
  private _uncertaintyRangeMeters: number = 5 * 1000; // 5Km
  private _earthRadiusMeters = 6371 * 1000;


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

    if(this.isClockwise(coords))
      coords.reverse();

    const polygon: string = `POLYGON ((${coords.join(', ')}))`;
    console.log(polygon);
    return polygon;
  }

  public searchNativePlants(latitude: number, longitude: number): Observable<GBIFPageableResult<GbifOccurrence>> {
    let params = {
      establishmentMeans: this._nativeKeyword,
      country: 'US',
      geometry: this.createCirclePolygon(latitude, longitude),
      limit: 300,
      taxonKey: this._plantKingdomKey
      // TODO offset: to get next page
    };

    const request = this._client.get<GBIFPageableResult<GbifOccurrence>>(`${this._v1Url}occurrence/search`, {
      params: params
    });

    return request.pipe(
      // tap((value: any) => {
      //   let plantCount = 0;
      //   let nonPlantCount = 0;
      //   let nonCount = 0;
      //   value.results.forEach((item: any) => {
      //     if(!item.kingdomKey || item.kingdomKey == '')
      //       nonCount++;
      //     else if(item.kingdomKey == this._plantKingdomKey)
      //       plantCount++;
      //     else if(item.kingdomKey != this._plantKingdomKey)
      //       nonPlantCount++;
      //   });

      //   console.log(plantCount, nonPlantCount, nonCount);
      // })
    );
  }
}
