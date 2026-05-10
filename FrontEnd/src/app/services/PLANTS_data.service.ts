import { Injectable } from "@angular/core";
import { Duration, GrowthHabit, PlantData } from "../models/gov/models";
import { HttpClient } from "@angular/common/http";
import { map, switchMap } from "rxjs/operators";
import { fromFetch } from 'rxjs/fetch';
import { SortOption } from "../plant-search/plant-search.component";
import { EMPTY, Observable } from "rxjs";
import { environment } from "../../environments/environment.prod";

@Injectable({
    providedIn: 'root'
})
export class GovPlantsDataService {
    public static readonly usdaGovPlantProfileUrl: string = 'https://plants.usda.gov/plant-profile/';
    private readonly _dataUrl = `${environment.apiUrl}/FileData/plantdata`;

    private static MIN_BATCH_SIZE: number = 20;
    // TODO smaller first batch size

    public constructor(private readonly _http: HttpClient) {
    }

    public getPlantById(acceptedSymbol: string): Observable<Readonly<PlantData>> {
        return this._http.get<PlantData>(this._dataUrl + '/' + acceptedSymbol).pipe(map(GovPlantsDataService.parsePlantData));
    }

    public getAllDefiniteNativePlantIds(): Observable<ReadonlyArray<Readonly<string>>> {
        return this._http.get<string[]>(this._dataUrl + '/id');
    }

    // TODO add batch index param 
    // TODO store url, batch index, and batch in map for in-memory cache

    // TODO swap to supporting array of growthhabit/duration, other filters
    public searchNativePlantsBatched(searchString: string, combinedFIP: string, growthHabit: GrowthHabit, duration: Duration, sortOption: SortOption, isSortAlphabeticOrder: boolean, batchSize: number = GovPlantsDataService.MIN_BATCH_SIZE): Observable<Readonly<PlantData>[]> {
        if (batchSize < GovPlantsDataService.MIN_BATCH_SIZE) batchSize = GovPlantsDataService.MIN_BATCH_SIZE;

        const params = new URLSearchParams({
            searchString,
            combinedFIP,
            growthHabit: growthHabit.toString(),
            duration: duration.toString(),
            sortOption: sortOption.toString(),
            ascending: isSortAlphabeticOrder.toString(),
            batchSize: batchSize.toString()
        });

        const url = `${this._dataUrl}/search?${params}`;

        return new Observable<Readonly<PlantData>[]>(subscriber => {
            const worker = new Worker(
                new URL('../web-workers/ndjsonstream.worker', import.meta.url),
                { type: 'module' }
            );

            worker.onmessage = ({ data }) => {
                if (data.error) {
                    subscriber.error(new Error(data.error));
                    worker.terminate();
                    return;
                }
                if (data.done) {
                    subscriber.complete();
                    worker.terminate();
                    return;
                }
                // parsePlantData stays on main thread - Set can't transfer via postMessage
                subscriber.next(
                    (data.batch as PlantData[]).map(GovPlantsDataService.parsePlantData)
                );
            };

            worker.onerror = (err) => {
                subscriber.error(err);
                worker.terminate();
            };

            worker.postMessage(url);

            return () => {
                worker.onmessage = null; // prevent any queued messages firing after termination
                worker.onerror = null;
                worker.terminate();
            };
        });
    }

    private static readableStreamToObservable<T>(stream: ReadableStream<T> | undefined): Observable<T> {
        if (stream == undefined || stream == null) return EMPTY;
        return new Observable<T>(subscriber => {
            const reader = stream.getReader();
            let cancelled = false;

            const read = async () => {
                try {
                    while (!cancelled) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        subscriber.next(value);
                        await new Promise(r => setTimeout(r, 0));
                    }
                    if (!cancelled) subscriber.complete();
                } catch (err) {
                    if (!cancelled) subscriber.error(err);
                }
            };

            read();

            // teardown called on unsubscribe
            return () => {
                cancelled = true;
                reader.cancel();
            };
        });
    }

    private static ndJsonTransformStream<R = string>(): TransformStream<string, R> {
        let leftover = '';

        return new TransformStream<string, R>({
            transform(chunk, controller) {
                let start = 0;
                let newLineIndex;

                const searchStr = leftover + chunk;
                while ((newLineIndex = searchStr.indexOf('\n', start)) !== -1) {
                    const line = searchStr.slice(start, newLineIndex);
                    start = newLineIndex + 1;
                    if (!line.trim()) continue;
                    controller.enqueue(JSON.parse(line) as R);
                }

                leftover = searchStr.slice(start);
            },
            flush(controller) {
                const line = leftover.trim();
                if (!line) return;
                controller.enqueue(JSON.parse(line) as R);
            }
        });
    }

    public getAllNativePlantDataBatched(): Observable<PlantData[]> {
        const batchSize: number = 25;
        const apiUrl: string = this._dataUrl + '?batchSize=' + batchSize;

        return fromFetch(apiUrl).pipe(
            switchMap(response => {
                if (!response.ok)
                    throw new Error(response.status + ' | ' + response.statusText);

                const stream: ReadableStream<PlantData[]> = response.body!.pipeThrough(new TextDecoderStream).pipeThrough(GovPlantsDataService.ndJsonTransformStream<PlantData[]>());
                return GovPlantsDataService.readableStreamToObservable(stream);
            }),
            map((vals: PlantData[]) => vals.map(val => GovPlantsDataService.parsePlantData(val))),
        );
    }

    private static parsePlantData(raw: PlantData) {
        return Object.freeze({
            ...raw,
            nativeStateAndProvinceCodes: new Set(raw.nativeStateAndProvinceCodes ?? []),
            growthHabit: new Set(raw.growthHabit ?? []),
            duration: new Set(raw.duration ?? []),
            stateAndProvince: new Set(raw.stateAndProvince ?? []),
            photos: (raw.photos ?? [])
        })
    }
}
