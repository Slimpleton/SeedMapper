import { GBIFPage } from "./gbif.page";

export interface GBIFPageableResult<T> extends GBIFPage {
    count: number,
    endOfRecords: boolean,
    facets: any[],
    results: T[]
}