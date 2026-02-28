import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { geoAlbersUsa, GeoPath, geoPath, GeoPermissibleObjects, GeoProjection } from 'd3-geo';
import { map, Observable, shareReplay } from 'rxjs';
import { feature, mesh } from 'topojson-client';
import { GeometryCollection, Properties, Topology } from 'topojson-specification';

export type MapPath = {
  id: string | number | undefined;
  d: string;
  name: string;
};

@Injectable({
  providedIn: 'root',
})
export class MapService {
  public static readonly PLANT_TILE_MAP_WIDTH: number = 400;
  public static readonly PLANT_TILE_MAP_HEIGHT: number = 140;
  public static readonly PLANT_OVERVIEW_MAP_WIDTH: number = 1200;
  public static readonly PLANT_OVERVIEW_MAP_HEIGHT: number = 420;

  private _topo$: Observable<Topology> = this._http
    .get<Topology>('/assets/counties-10m.json')
    .pipe(shareReplay(1));

  private readonly projectionCache = new Map<string, GeoProjection>();
  private readonly pathCache = new Map<string, GeoPath<unknown, GeoPermissibleObjects>>();

  private projectionKey(w: number, h: number): string {
    return `${w}x${h}`;
  }

  private getProjection(w: number, h: number): GeoProjection {
    const key = this.projectionKey(w, h);

    let projection = this.projectionCache.get(key);
    if (!projection) {
      projection = geoAlbersUsa()
        .translate([w / 2, h / 2])
        .scale(w * .75);

      this.projectionCache.set(key, projection);
    }

    return projection;
  }

  private getPath(w: number, h: number) {
    const key = this.projectionKey(w, h);

    let path = this.pathCache.get(key);
    if (!path) {
      path = geoPath(this.getProjection(w, h));
      this.pathCache.set(key, path);
    }

    return path;
  }

  public countyMeshPath$(w: number, h: number) {
    return this._countyMesh$.pipe(
      map(mesh => this.getPath(w, h)(mesh)!),
      shareReplay(1)
    );
  }

  public nationBorderPath$(w: number, h: number) {
    return this._nationBorder$.pipe(
      map(border => this.getPath(w, h)(border)!),
      shareReplay(1)
    );
  }

  public countiesPaths$(w: number, h: number): Observable<MapPath[]> {
    return this._topo$.pipe(
      map(topo =>
        feature(
          topo,
          topo.objects['counties'] as GeometryCollection<Properties>
        )),
      map(fc =>
        fc.features.map(f => ({
          id: f.id,
          d: this.getPath(w, h)(f)!,
          name: f.properties!['name'],
        }))),
      shareReplay(1)
    );
  }

  private _countyMesh$: Observable<GeoJSON.MultiLineString> =
    this._topo$.pipe(
      map(topo => mesh(topo, topo.objects['counties'] as GeometryCollection, (a, b) => a !== b)),
      shareReplay(1)
    );

  private _nationBorder$: Observable<GeoJSON.MultiLineString> =
    this._topo$.pipe(
      map(topo => mesh(topo, topo.objects['nation'] as GeometryCollection)),
      shareReplay(1)
    );


  constructor(private readonly _http: HttpClient) { }

  public getStatesGeometry(): Observable<GeometryCollection> {
    return this._topo$.pipe(map(topo => topo.objects['states'] as GeometryCollection));
  }

  public getCountiesGeometry(): Observable<GeometryCollection> {
    return this._topo$.pipe(map(topo => topo.objects['counties'] as GeometryCollection));
  }
}