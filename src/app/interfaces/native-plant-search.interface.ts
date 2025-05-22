import { Observable } from "rxjs";
import { GbifOccurrence } from "../models/gbif/gbif.occurrence";
import { PlantData } from "../models/gov/models";

export interface NativePlantSearch {
    searchNativePlants(latitude: number, longitude: number): Observable<GbifOccurrence[] | PlantData[]>
}