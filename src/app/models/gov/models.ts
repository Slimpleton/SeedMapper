export type GrowthForm = 'Bunch' | 'Colonizing' | 'Multiple Stem' | 'Rhizomatous' | 'Single Crown' | 'Single Stem' | 'Stoloniferous' | 'Thicket Forming';
export type Color = 'Black' | 'Blue' | 'Brown' | 'Green' | 'Orange' | 'Purple' | 'Red' | 'White' | 'Yellow' | 'Dark Green' | 'Gray-Green' | 'White-Gray' | 'Yellow-Green';
export type Rate = 'Moderate' | 'None' | 'Rapid' | 'Slow';
export type Category = 'Dicot' | 'Fern' | 'Green alga' | 'Gymnosperm' | 'Hornwort' | 'Horsetail' | 'Lichen' | 'Liverwort' | 'Lycopod' | 'Monocot' | 'Moss' | 'Quillwort' | 'RA' | 'Whisk-fern';
export type Level = 'High' | 'Medium' | 'Low' | 'None';
export type NativityStatus = 'N' | 'I';
export type Duration = 'Perennial' | 'Biennial' | 'Annual' | 'AN';
export type Season = 'Winter' | 'Spring' | 'Summer' | 'Fall' | 'Year Round';
export type Porosity = 'Dense' | 'Moderate' | 'Porous';
export type ShadeTolerance = 'Intermediate' | 'Intolerant' | 'Tolerant';
export type ShapeAndOrientation = 'Climbing' | 'Columnar' | 'Conical' | 'Decumbent' | 'Erect' | 'Irregular' | 'Oval' | 'Prostrate' | 'Rounded' | 'Semi-Erect' | 'Vase';
export type Lifespan = 'Long' | 'Moderate' | 'Short';
export type Toxicity = 'Severe' | 'Moderate' | 'None' | 'Slight';
export type Texture = 'Coarse' | 'Fine' | 'Medium';
export type CommercialAvailability = 'Contracting Only' | 'Field Collections Only' | 'No Known Source' | 'Routinely Available';

// TOOD hardest part is native status type mapping idk what they stand for

// State and Province column is {COUNTRY_CODE}([ST,ST,ST,...]) OR USA+([PR, VI]) for puerto rico or virgin island or both

// Native statis seems to be like Two letter region (StatusCodeEnum)
// where the enum is either I for invasive or N for Native
//e.g. NA(N), CAN(I)NA(I), L48(I)CAN(I)

//PLANTS Floristic area is a little different as its not status, just occurrences
// TODO use gov ACCEPTED_SYMBOL column / type to query the website
// https://plants.usda.gov/plant-profile/LAENN is the plant profile for
// LAENN aka horseweed
// https://plants.usda.gov/plant-profile/maam/sources gives some plant occurrences / distributions


// export interface PlantData {
//     acceptedSymbol: string;
//     synonymSymbol: string;
//     symbol: string;
//     scientificName: string;
//     plantsFloristicArea: string;
//     stateAndProvince: string;
//     category: Category;
//     family: string;
//     duration: Duration[] | Duration;
//     growthHabit: string;
//     nativeStatus: string;
//     characteristicsData: boolean;
//     activeGrowthPeriod: Season[] | Season;
//     afterHarvestRegrowthRate: Rate;
//     bloat: Level;
//     cnRatio: Level;
//     coppicePotential: boolean;
//     fallConspicuous: boolean;
//     fireResistance: boolean;
//     flowerColor: Color;
//     flowerConspicuous: boolean;
//     foliageColor: Color;
//     foliagePorosityWinter: Porosity;
//     foliagePorosityDummer: Porosity;
//     foliageTexture: Texture;
//     fruitColor: Color;
//     fruitConspicuous: boolean;
//     growthForm: GrowthForm;
//     growthRate: Rate;
//     heightAtBaseAgeMaximumFeet: number;
//     heightMatureFeet: number;
//     knownAllelopath: boolean;
//     leafRetention: boolean;
//     lifespan: Lifespan;
//     lowGrowingGrass: boolean;
//     nitrogenFixation: Level;
//     resproutAbility: boolean;
//     shapeAndOrientation: ShapeAndOrientation;
//     toxicity: Toxicity;
//     frostFreeDaysMinimum: number;
//     phMinimum: number;
//     phMaximum: number;
//     plantingDensityPerAcreMinimum: number;
//     plantingDensityPerAcreMaximum: number;
//     precipitationMinimum: number;
//     precipitationMaximum: number;
//     rootDepthMinimumInches: number;
//     shadeTolerance: ShadeTolerance;
//     temperatureMinimumF: number;
//     commercialAvailability: CommercialAvailability;
//     hedgeTolerance: Level;
//     moistureUse: Level;
//     adaptedToCoarseTexturedSoils: boolean;
//     adaptedToMediumTexturedSoils: boolean;
//     adaptedToFineTexturedSoils: boolean;
//     anaerobicTolerance: Level;
//     caco3Tolerance: Level;
//     coldStratificationRequired: boolean;
//     droughtTolerance: Level;
//     fertilityRequirement: Level;
//     fireTolerance: Level;
//     salinityTolerance: Level;
//     fruitSeedAbundance: Level;
//     fruitSeedPeriodBegin: Season;
//     fruitSeedPeriodEnd: Season;
//     fruitSeedPersistence: boolean;
//     propogatedByBareRoot: boolean;
//     propogatedByBulbs: boolean;
//     propogatedByContainer: boolean;
//     propogatedByCorms: boolean;
//     propogatedByCuttings: boolean;
//     propogatedBySeed: boolean;
//     propogatedBySod: boolean;
//     propogatedBySprigs: boolean;
//     propogatedByTubers: boolean;
//     seedsPerPound: number;
//     seedSpreadRate: Rate;
//     seedlingVigor: Level;
//     smallGrain: boolean;
//     vegetativeSpreadRate: Rate;
//     berryNutSeedProduct: boolean;
//     christmasTreeProduct: boolean;
//     fodderProduct: boolean;
//     fuelwoodProduct: Level;
//     lumberProduct: boolean;
//     navalStoreProduct: boolean;
//     nurseryStockProduct: boolean;
//     palatableBrowseAnimal: Level;
//     palatableGrazeAnimal: Level;
//     palatableHuman: boolean;
//     postProduct: boolean;
//     proteinPotential: Level;
//     pulpwoodProduct: boolean;
//     bloomPeriod: string;
//     veneerProduct: boolean;
// }

// Define the interface based on the exact CSV header row
export interface PlantDataRaw {
    "Accepted Symbol": string;
    "Synonym Symbol": string;
    "Symbol": string;
    "Scientific Name": string;
    "PLANTS Floristic Area": string;
    "State and Province": string;
    "Category": Category;
    "Family": string;
    "Duration": Duration[] | Duration;
    "Growth Habit": string;
    "Native Status": string;
    "Characteristics Data": boolean;
    "Active Growth Period": Season[] | Season;
    "After Harvest Regrowth Rate": Rate;
    "Bloat": Level;
    "C:N Ratio": Level;
    "Coppice Potential": boolean;
    "Fall Conspicuous": boolean;
    "Fire Resistance": boolean;
    "Flower Color": Color;
    "Flower Conspicuous": boolean;
    "Foliage Color": Color;
    "Foliage Porosity Summer": Porosity;
    "Foliage Porosity Winter": Porosity;
    "Foliage Texture": Texture;
    "Fruit Color": Color;
    "Fruit Conspicuous": boolean;
    "Growth Form": GrowthForm;
    "Growth Rate": Rate;
    "Height at Base Age, Maximum (feet)": number;
    "Height, Mature (feet)": number;
    "Known Allelopath": boolean;
    "Leaf Retention": boolean;
    "Lifespan": Lifespan;
    "Low Growing Grass": boolean;
    "Nitrogen Fixation": Level;
    "Resprout Ability": boolean;
    "Shape and Orientation": ShapeAndOrientation;
    "Toxicity": Toxicity;
    "Adapted to Coarse Textured Soils": boolean;
    "Adapted to Medium Textured Soils": boolean;
    "Adapted to Fine Textured Soils": boolean;
    "Anaerobic Tolerance": Level;
    "CaCO<SUB>3</SUB> Tolerance": Level;
    "Cold Stratification Required": boolean;
    "Drought Tolerance": Level;
    "Fertility Requirement": Level;
    "Fire Tolerance": Level;
    "Frost Free Days, Minimum": number;
    "Hedge Tolerance": Level;
    "Moisture Use": Level;
    "pH (Minimum)": number;
    "pH (Maximum)": number;
    "Planting Density per Acre, Minimum": number;
    "Planting Density per Acre, Maximum": number;
    "Precipitation (Minimum)": number;
    "Precipitation (Maximum)": number;
    "Root Depth, Minimum (inches)": number;
    "Salinity Tolerance": Level;
    "Shade Tolerance": ShadeTolerance;
    "Temperature, Minimum (°F)": number;
    "Bloom Period": string;
    "Commercial Availability": CommercialAvailability;
    "Fruit/Seed Abundance": Level;
    "Fruit/Seed Period Begin": Season;
    "Fruit/Seed Period End": Season;
    "Fruit/Seed Persistence": boolean;
    "Propogated by Bare Root": boolean;
    "Propogated by Bulbs": boolean;
    "Propogated by Container": boolean;
    "Propogated by Corms": boolean;
    "Propogated by Cuttings": boolean;
    "Propogated by Seed": boolean;
    "Propogated by Sod": boolean;
    "Propogated by Sprigs": boolean;
    "Propogated by Tubers": boolean;
    "Seeds per Pound": number;
    "Seed Spread Rate": Rate;
    "Seedling Vigor": Level;
    "Small Grain": boolean;
    "Vegetative Spread Rate": Rate;
    "Berry/Nut/Seed Product": boolean;
    "Christmas Tree Product": boolean;
    "Fodder Product": boolean;
    "Fuelwood Product": Level;
    "Lumber Product": boolean;
    "Naval Store Product": boolean;
    "Nursery Stock Product": boolean;
    "Palatable Browse Animal": Level;
    "Palatable Graze Animal": Level;
    "Palatable Human": boolean;
    "Post Product": boolean;
    "Protein Potential": Level;
    "Pulpwood Product": boolean;
    "Veneer Product": boolean;
}

// Define the camelCase interface for working with the data
// Using Readonly to ensure immutability
export type PlantData = Readonly<{
    acceptedSymbol: string;
    synonymSymbol: string;
    symbol: string;
    scientificName: string;
    plantsFloristicArea: string;
    stateAndProvince: string;
    category: Category;
    family: string;
    duration: ReadonlyArray<Duration> | Duration;
    growthHabit: string;
    nativeStatus: string;
    characteristicsData: boolean;
    activeGrowthPeriod: ReadonlyArray<Season> | Season;
    afterHarvestRegrowthRate: Rate;
    bloat: Level;
    cnRatio: Level;
    coppicePotential: boolean;
    fallConspicuous: boolean;
    fireResistance: boolean;
    flowerColor: Color;
    flowerConspicuous: boolean;
    foliageColor: Color;
    foliagePorosityWinter: Porosity;
    foliagePorositySummer: Porosity;
    foliageTexture: Texture;
    fruitColor: Color;
    fruitConspicuous: boolean;
    growthForm: GrowthForm;
    growthRate: Rate;
    heightAtBaseAgeMaximumFeet: number;
    heightMatureFeet: number;
    knownAllelopath: boolean;
    leafRetention: boolean;
    lifespan: Lifespan;
    lowGrowingGrass: boolean;
    nitrogenFixation: Level;
    resproutAbility: boolean;
    shapeAndOrientation: ShapeAndOrientation;
    toxicity: Toxicity;
    adaptedToCoarseTexturedSoils: boolean;
    adaptedToMediumTexturedSoils: boolean;
    adaptedToFineTexturedSoils: boolean;
    anaerobicTolerance: Level;
    caco3Tolerance: Level;
    coldStratificationRequired: boolean;
    droughtTolerance: Level;
    fertilityRequirement: Level;
    fireTolerance: Level;
    frostFreeDaysMinimum: number;
    hedgeTolerance: Level;
    moistureUse: Level;
    phMinimum: number;
    phMaximum: number;
    plantingDensityPerAcreMinimum: number;
    plantingDensityPerAcreMaximum: number;
    precipitationMinimum: number;
    precipitationMaximum: number;
    rootDepthMinimumInches: number;
    salinityTolerance: Level;
    shadeTolerance: ShadeTolerance;
    temperatureMinimumF: number;
    bloomPeriod: string;
    commercialAvailability: CommercialAvailability;
    fruitSeedAbundance: Level;
    fruitSeedPeriodBegin: Season;
    fruitSeedPeriodEnd: Season;
    fruitSeedPersistence: boolean;
    propogatedByBareRoot: boolean;
    propogatedByBulbs: boolean;
    propogatedByContainer: boolean;
    propogatedByCorms: boolean;
    propogatedByCuttings: boolean;
    propogatedBySeed: boolean;
    propogatedBySod: boolean;
    propogatedBySprigs: boolean;
    propogatedByTubers: boolean;
    seedsPerPound: number;
    seedSpreadRate: Rate;
    seedlingVigor: Level;
    smallGrain: boolean;
    vegetativeSpreadRate: Rate;
    berryNutSeedProduct: boolean;
    christmasTreeProduct: boolean;
    fodderProduct: boolean;
    fuelwoodProduct: Level;
    lumberProduct: boolean;
    navalStoreProduct: boolean;
    nurseryStockProduct: boolean;
    palatableBrowseAnimal: Level;
    palatableGrazeAnimal: Level;
    palatableHuman: boolean;
    postProduct: boolean;
    proteinPotential: Level;
    pulpwoodProduct: boolean;
    veneerProduct: boolean;
}>;

