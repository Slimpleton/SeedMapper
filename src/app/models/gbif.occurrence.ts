import { GbifExtensions } from "./gbif.extensions";

export type TaxonomicStatus = 
    'ACCEPTED' | 'DOUBTFUL' | 'SYNONYM' | 'HETEROTYPIC_SYNONYM' | 'HOMOTYPIC_SYNONYM' | 'PROPARTE_SYNONYM' | 'MISAPPLIED';

export function isAcceptedStatus(status: TaxonomicStatus) {
  return status === 'ACCEPTED';
}

export interface GbifOccurrence {
    key: number;
    datasetKey: string;
    publishingOrgKey: string;
    networkKeys: string[];
    installationKey: string;
    hostingOrganizationKey: string;
    publishingCountry: string;
    protocol: string;
    lastCrawled: string;
    lastParsed: string;
    crawlId: number;
    extensions?: GbifExtensions;
    basisOfRecord: string;
    occurrenceStatus: string;
    establishmentMeans: string;
    taxonKey: number;
    kingdomKey: number;
    phylumKey: number;
    classKey: number;
    orderKey: number;
    familyKey: number;
    genusKey: number;
    speciesKey: number;
    acceptedTaxonKey: number;
    scientificName: string;
    acceptedScientificName: string;
    kingdom: string;
    phylum: string;
    order: string;
    family: string;
    genus: string;
    species: string;
    genericName: string;
    specificEpithet: string;
    taxonRank: string;
    taxonomicStatus: TaxonomicStatus;
    iucnRedListCategory?: string;
    dateIdentified?: string;
    decimalLatitude: number;
    decimalLongitude: number;
    continent?: string;
    stateProvince?: string;
    gadm?: {
      level0?: { gid: string; name: string };
      level1?: { gid: string; name: string };
      level2?: { gid: string; name: string };
    };
    year?: number;
    month?: number;
    eventDate?: string;
    issues?: string[];
    modified: string;
    lastInterpreted: string;
    references?: string;
    license?: string;
    isSequenced?: boolean;
    identifiers?: { identifier: string }[];
    media?: any[];
    facts?: any[];
    relations?: any[];
    institutionKey?: string;
    collectionKey?: string;
    isInCluster?: boolean;
    otherCatalogNumbers?: string;
    recordedBy?: string;
    identifiedBy?: string;
    preparations?: string;
    dnaSequenceID?: string[];
    geodeticDatum?: string;
    class: string;
    countryCode: string;
    recordedByIDs?: string[];
    identifiedByIDs?: string[];
    gbifRegion?: string;
    country: string;
    publishedByGbifRegion?: string;
    recordNumber?: string;
    identifier: string;
    verbatimEventDate?: string;
    locality?: string;
    county?: string;
    georeferenceRemarks?: string;
    collectionCode?: string;
    gbifID: string;
    occurrenceID: string;
    taxonID?: string;
    institutionCode?: string;
    rights?: string;
    higherClassification?: string;
    collectionID?: string;
    georeferenceSources?: string;
  }
  