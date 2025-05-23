import { Injectable } from '@angular/core';
import * as US from 'us-atlas/states-10m.json';
import * as CANADA from 'us-atlas/states-albers-10m.json';
import * as topojson from 'topojson-client';
import { geoContains } from 'd3-geo';

export interface StateInfo {
  id: string;
  name: string;
  properties?: any;
  country?: string;
}


@Injectable({
  providedIn: 'root'
})
export class StateGeometryService {
  private usStates: any;
  private canadaProvinces: any;

  constructor() {
    this.initializeGeometries();
  }

  private initializeGeometries(): void {
    // Convert TopoJSON to GeoJSON for US states
    this.usStates = topojson.feature(US as any, (US as any).objects.states);
    // Convert TopoJSON to GeoJSON for Canadian provinces (if available)
    this.canadaProvinces = topojson.feature(CANADA as any, (CANADA as any).objects.states);
  }

  /**
  * Find which US state contains the given latitude/longitude point
  * @param lat Latitude
  * @param lng Longitude
  * @returns StateInfo object or null if not found
  */
  findUSState(lat: number, lng: number): StateInfo | null {
    const point: [number, number] = [lng, lat]; // GeoJSON uses [longitude, latitude]

    for (const feature of this.usStates.features) {
      if (this.isPointInFeature(point, feature)) {
        return {
          id: feature.id || feature.properties?.GEOID || '',
          name: feature.properties?.NAME || feature.properties?.name || 'Unknown',
          properties: feature.properties
        };
      }
    }

    return null;
  }

  /**
   * Find which Canadian province contains the given latitude/longitude point
   * @param lat Latitude
   * @param lng Longitude
   * @returns StateInfo object or null if not found
   */
  findCanadianProvince(lat: number, lng: number): StateInfo | null {
    if (!this.canadaProvinces) {
      return null;
    }

    const point: [number, number] = [lng, lat];

    for (const feature of this.canadaProvinces.features) {
      if (this.isPointInFeature(point, feature)) {
        return {
          id: feature.id || feature.properties?.GEOID || '',
          name: feature.properties?.NAME || feature.properties?.name || 'Unknown',
          properties: feature.properties
        };
      }
    }

    return null;
  }

  /**
   * Find which state/province contains the given point (checks both US and Canada)
   * @param lat Latitude
   * @param lng Longitude
   * @returns StateInfo object with country info or null if not found
   */
  findStateOrProvince(lat: number, lng: number): StateInfo | null {
    // Try US first (most common case)
    const usState = this.findUSState(lat, lng);
    if (usState) {
      return { ...usState, country: 'US' };
    }

    // Try Canada
    const canadianProvince = this.findCanadianProvince(lat, lng);
    if (canadianProvince) {
      return { ...canadianProvince, country: 'Canada' };
    }

    return null;
  }


  /**
   * Check if a point is inside a GeoJSON feature using d3-geo
   * @param point [longitude, latitude]
   * @param feature GeoJSON feature
   * @returns boolean
   */
  private isPointInFeature(point: [number, number], feature: any): boolean {
    try {
      // Handle different geometry types
      if (feature.geometry.type === 'Polygon') {
        return geoContains(feature, point);
      } else if (feature.geometry.type === 'MultiPolygon') {
        return geoContains(feature, point);
      }
      return false;
    } catch (error) {
      console.error('Error checking point in feature:', error);
      return false;
    }
  }

}
