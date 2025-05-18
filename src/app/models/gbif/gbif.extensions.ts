export interface GbifExtensions {
  "http://rs.gbif.org/terms/1.0/Identifier"?: GbifIdentifier[];
  "http://rs.tdwg.org/dwc/terms/Identification"?: GbifIdentification[];
}

export interface GbifIdentifier {
  "http://purl.org/dc/terms/identifier": string;
  "https://symbiota.org/terms/identifier/initialTimestamp"?: string;
  "http://purl.org/dc/terms/title"?: string;
}

export interface GbifIdentification {
  "http://rs.tdwg.org/dwc/terms/scientificName": string;
  "http://rs.tdwg.org/dwc/terms/genus"?: string;
  "http://portal.idigbio.org/terms/recordID"?: string;
  "http://purl.org/dc/terms/modified"?: string;
  "http://rs.tdwg.org/dwc/terms/scientificNameAuthorship"?: string;
  "http://rs.tdwg.org/dwc/terms/specificEpithet"?: string;
  "http://rs.tdwg.org/dwc/terms/dateIdentified"?: string;
  "http://rs.tdwg.org/dwc/terms/identifiedBy"?: string;
}