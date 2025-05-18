export interface GBIFGADMRegion extends GADMRegion{
    gadmLevel: number;
    variantName: string;
    nonLatinName: string;
    type: string;
    englishType: string;
    higherRegions: GADMRegion;
}

export interface GADMRegion{
    id: string;
    name: string;
}