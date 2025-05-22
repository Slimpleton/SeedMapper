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