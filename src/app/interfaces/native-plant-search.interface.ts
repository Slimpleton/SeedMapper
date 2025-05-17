import { Observable } from "rxjs";
import { GbifOccurrence } from "../models/gbif.occurrence";

export interface NativePlantSearch{
    searchNativePlants(latitude: number, longitude: number): Observable<GbifOccurrence[]>
}