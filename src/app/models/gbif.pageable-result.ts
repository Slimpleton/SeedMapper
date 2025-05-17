export interface GBIFPageableResult<T> {
    count: number,
    endOfRecords: boolean,
    facets: any[],
    limit: number,
    offset: number,
    results: T[]
}