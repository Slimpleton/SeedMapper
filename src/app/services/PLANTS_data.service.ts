import { Injectable } from "@angular/core";
import { NativePlantSearch } from "../interfaces/native-plant-search.interface";
import { Observable } from "rxjs";
import { PlantData } from "../models/gov/models";

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

    public searchNativePlants(latitude: number, longitude: number): Observable<PlantData[]> {
        throw new Error("Method not implemented.");
    }


    // For simplicity, we'll use the Readonly version as our main type
    // If you prefer the Record version, replace PlantData with PlantDataAsRecord throughout the code

    // Function to convert keys from original format to camelCase
    private toCamelCase(str: string): string {
        return str
            .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
                return index === 0 ? word.toLowerCase() : word.toUpperCase();
            })
            .replace(/\s+/g, '')
            .replace(/[^\w\s]/g, '')
            .replace(/SUB/g, '') // Remove the SUB tag from CaCO<SUB>3</SUB>
            .replace(/^(.+)(Tolerance|Potential|Rate|Conspicuous|Ability|Period|Color|Form|Vigor)$/, '$1$2');
    }
}