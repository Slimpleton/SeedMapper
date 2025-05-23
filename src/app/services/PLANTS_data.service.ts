import { Injectable } from "@angular/core";
import { NativePlantSearch } from "../interfaces/native-plant-search.interface";
import { catchError, map, Observable, of, shareReplay } from "rxjs";
import { PlantData } from "../models/gov/models";
import { HttpClient } from "@angular/common/http";

@Injectable({
    providedIn: 'root'
})
export class GovPlantsDataService implements NativePlantSearch {

    private readonly _headerMapping: Record<string, keyof PlantData> = {
        "Accepted Symbol": "acceptedSymbol",
        "Synonym Symbol": "synonymSymbol",
        "Symbol": "symbol",
        "Scientific Name": "scientificName",
        "PLANTS Floristic Area": "plantsFloristicArea",
        "State and Province": "stateAndProvince",
        "Category": "category",
        "Family": "family",
        "Duration": "duration",
        "Growth Habit": "growthHabit",
        "Native Status": "nativeStatus",
        "Characteristics Data": "characteristicsData",
        "Active Growth Period": "activeGrowthPeriod",
        "After Harvest Regrowth Rate": "afterHarvestRegrowthRate",
        "Bloat": "bloat",
        "C:N Ratio": "cnRatio",
        "Coppice Potential": "coppicePotential",
        "Fall Conspicuous": "fallConspicuous",
        "Fire Resistance": "fireResistance",
        "Flower Color": "flowerColor",
        "Flower Conspicuous": "flowerConspicuous",
        "Foliage Color": "foliageColor",
        "Foliage Porosity Summer": "foliagePorositySummer",
        "Foliage Porosity Winter": "foliagePorosityWinter",
        "Foliage Texture": "foliageTexture",
        "Fruit Color": "fruitColor",
        "Fruit Conspicuous": "fruitConspicuous",
        "Growth Form": "growthForm",
        "Growth Rate": "growthRate",
        "Height at Base Age, Maximum (feet)": "heightAtBaseAgeMaximumFeet",
        "Height, Mature (feet)": "heightMatureFeet",
        "Known Allelopath": "knownAllelopath",
        "Leaf Retention": "leafRetention",
        "Lifespan": "lifespan",
        "Low Growing Grass": "lowGrowingGrass",
        "Nitrogen Fixation": "nitrogenFixation",
        "Resprout Ability": "resproutAbility",
        "Shape and Orientation": "shapeAndOrientation",
        "Toxicity": "toxicity",
        "Adapted to Coarse Textured Soils": "adaptedToCoarseTexturedSoils",
        "Adapted to Medium Textured Soils": "adaptedToMediumTexturedSoils",
        "Adapted to Fine Textured Soils": "adaptedToFineTexturedSoils",
        "Anaerobic Tolerance": "anaerobicTolerance",
        "CaCO<SUB>3</SUB> Tolerance": "caco3Tolerance",
        "Cold Stratification Required": "coldStratificationRequired",
        "Drought Tolerance": "droughtTolerance",
        "Fertility Requirement": "fertilityRequirement",
        "Fire Tolerance": "fireTolerance",
        "Frost Free Days, Minimum": "frostFreeDaysMinimum",
        "Hedge Tolerance": "hedgeTolerance",
        "Moisture Use": "moistureUse",
        "pH (Minimum)": "phMinimum",
        "pH (Maximum)": "phMaximum",
        "Planting Density per Acre, Minimum": "plantingDensityPerAcreMinimum",
        "Planting Density per Acre, Maximum": "plantingDensityPerAcreMaximum",
        "Precipitation (Minimum)": "precipitationMinimum",
        "Precipitation (Maximum)": "precipitationMaximum",
        "Root Depth, Minimum (inches)": "rootDepthMinimumInches",
        "Salinity Tolerance": "salinityTolerance",
        "Shade Tolerance": "shadeTolerance",
        "Temperature, Minimum (°F)": "temperatureMinimumF",
        "Bloom Period": "bloomPeriod",
        "Commercial Availability": "commercialAvailability",
        "Fruit/Seed Abundance": "fruitSeedAbundance",
        "Fruit/Seed Period Begin": "fruitSeedPeriodBegin",
        "Fruit/Seed Period End": "fruitSeedPeriodEnd",
        "Fruit/Seed Persistence": "fruitSeedPersistence",
        "Propogated by Bare Root": "propogatedByBareRoot",
        "Propogated by Bulbs": "propogatedByBulbs",
        "Propogated by Container": "propogatedByContainer",
        "Propogated by Corms": "propogatedByCorms",
        "Propogated by Cuttings": "propogatedByCuttings",
        "Propogated by Seed": "propogatedBySeed",
        "Propogated by Sod": "propogatedBySod",
        "Propogated by Sprigs": "propogatedBySprigs",
        "Propogated by Tubers": "propogatedByTubers",
        "Seeds per Pound": "seedsPerPound",
        "Seed Spread Rate": "seedSpreadRate",
        "Seedling Vigor": "seedlingVigor",
        "Small Grain": "smallGrain",
        "Vegetative Spread Rate": "vegetativeSpreadRate",
        "Berry/Nut/Seed Product": "berryNutSeedProduct",
        "Christmas Tree Product": "christmasTreeProduct",
        "Fodder Product": "fodderProduct",
        "Fuelwood Product": "fuelwoodProduct",
        "Lumber Product": "lumberProduct",
        "Naval Store Product": "navalStoreProduct",
        "Nursery Stock Product": "nurseryStockProduct",
        "Palatable Browse Animal": "palatableBrowseAnimal",
        "Palatable Graze Animal": "palatableGrazeAnimal",
        "Palatable Human": "palatableHuman",
        "Post Product": "postProduct",
        "Protein Potential": "proteinPotential",
        "Pulpwood Product": "pulpwoodProduct",
        "Veneer Product": "veneerProduct"
    };

    private readonly dataUrl = 'assets/PLANTS_Characteristics_Plus_Data.csv';

    public constructor(private readonly http: HttpClient) { }

    public searchNativePlants(latitude: number, longitude: number): Observable<PlantData[]> {
        throw new Error("Method not implemented.");
    }

    public loadPlantData(): Observable<ReadonlyArray<PlantData>> {
        return this.http.get(this.dataUrl, { responseType: 'text' })
            .pipe(
                map(csvText => this.parseCsv(csvText)),
                map(csvData => {
                    // Convert each row to PlantData object
                    const plantData = csvData.map(row => this.convertCsvRowToPlantData(row));
                    // Return as a deeply immutable array
                    return Object.freeze(plantData);
                }),
                shareReplay(1),
                catchError(error => {
                    console.error('Error loading plant data:', error);
                    return of([] as ReadonlyArray<PlantData>);
                })
            );
    }


    private parseCsv(csvText: string): Record<string, string>[] {
        // Simple CSV parser (you might want to use a library like papaparse in a real app)
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(header => header.trim());

        return lines.slice(1)
            .filter(line => line.trim() !== '') // Skip empty lines
            .map(line => {
                const values = this.parseCsvLine(line);
                const row: Record<string, string> = {};

                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });

                return row;
            });
    }

    // Helper to handle quoted values and commas within fields
    private parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        // Add the last field
        result.push(current.trim());
        return result;
    }

    private convertCsvRowToPlantData(csvRow: Record<string, string>): PlantData {
        const result: Record<string, any> = {};

        // Map each property using our predefined mapping
        Object.entries(csvRow).forEach(([key, value]) => {
            if (key in this._headerMapping) {
                const camelKey = this._headerMapping[key] as keyof PlantData;

                // Handle different data types
                if (value === 'true' || value === 'yes' || value === 'y') {
                    result[camelKey] = true;
                } else if (value === 'false' || value === 'no' || value === 'n') {
                    result[camelKey] = false;
                } else if (!isNaN(Number(value)) && value !== '') {
                    result[camelKey] = Number(value);
                } else if (value.includes(',')) {
                    // Handle array values (comma-separated strings)
                    // Make the array immutable using Object.freeze
                    result[camelKey] = Object.freeze(value.split(',').map(v => v.trim()));
                } else {
                    result[camelKey] = value;
                }
            }
        });
        // Return as a deeply immutable object
        return Object.freeze(result) as PlantData;
    }

    /**
     * Likely State/Province Code Format:
     * Based on standard USDA practices, the PLANTS database most likely uses:
     * Uses stuff like NA (L48) for north america lower 48 states and other bs
     * 
     * US States: Standard 2-letter postal codes (AL, AK, AR, AZ, CA, CO, CT, DE, FL, GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ, NM, NY, NC, ND, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, WV, WI, WY)
     * US Territories: DC, PR (Puerto Rico), VI (Virgin Islands), GU (Guam), AS (American Samoa), MP (Northern Mariana Islands)
     * Canadian Provinces: Likely standard 2-letter codes (AB, BC, MB, NB, NL, NT, NS, NU, ON, PE, QC, SK, YT)
     */
}