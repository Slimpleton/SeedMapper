
using Backend.Models;
using Microsoft.VisualBasic.FileIO;
using Microsoft.Win32.SafeHandles;
using System.Collections.Frozen;
using System.Reflection;
using System.Runtime.Serialization;
using System.Text;
using System.Text.RegularExpressions;

namespace Backend.Services
{
    public static partial class FileService
    {
        private static FrozenDictionary<string, HashSet<PlantData>> PlantsByLocation { get; set; }
        = FrozenDictionary<string, HashSet<PlantData>>.Empty;
        public static PlantData[] PlantData { get; }
        private static readonly SafeFileHandle? _photoFileHandle;
        public static FrozenDictionary<string, PlantData> AcceptedSymbolToPlant { get; private set; }
         = FrozenDictionary<string, PlantData>.Empty;

        public static FrozenDictionary<string, string> AcceptedSymbolToTaxonId { get; private set; }
         = FrozenDictionary<string, string>.Empty;
        public static FrozenDictionary<string, (long FirstOffset, long TotalBytes)> PhotoOffsetsBySymbol { get; private set; }
            = FrozenDictionary<string, (long FirstOffset, long TotalBytes)>.Empty;
        public static FrozenDictionary<long, Observer> ObserversById { get; private set;} 
         = FrozenDictionary<long, Observer>.Empty;

        private const int MinimumSpeciesNameWords = 2;

        private static readonly FrozenDictionary<LocationCode, NativeLocationCode[]> _LocationToNativeRegion =
    new Dictionary<LocationCode, NativeLocationCode[]>()
    {
        // US States (Lower 48)
        { LocationCode.AL, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.AR, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.AZ, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.CA, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.CO, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.CT, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.DC, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.DE, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.FL, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.GA, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.IL, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.IN, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.IA, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.KS, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.KY, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.LA, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.ME, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.MD, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.MA, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.MI, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.MN, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.MS, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.MO, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.MT, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.NE, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.NV, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.NH, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.NJ, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.NM, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.NY, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.NC, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.ND, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.OH, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.OK, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.OR, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.PA, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.RI, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.SC, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.SD, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.TN, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.TX, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.UT, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.VT, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.VA, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.WA, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.WV, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.WI, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.WY, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.ID, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },

        // Alaska and Hawaii
        { LocationCode.AK, new[] { NativeLocationCode.AK } },
        { LocationCode.HI, new[] { NativeLocationCode.HI } },

        // US Territories
        { LocationCode.PR, new[] { NativeLocationCode.PR } },
        { LocationCode.VI, new[] { NativeLocationCode.VI } },
        { LocationCode.GU, new[] { NativeLocationCode.PR } },
        { LocationCode.AS, new[] { NativeLocationCode.PR } },
        { LocationCode.MP, new[] { NativeLocationCode.PR } },
        { LocationCode.PW, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.UM, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.NAV, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.FM, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },
        { LocationCode.MH, new[] { NativeLocationCode.L48, NativeLocationCode.NA } },

        // Canada
        { LocationCode.AB, new[] { NativeLocationCode.CAN } },
        { LocationCode.BC, new[] { NativeLocationCode.CAN } },
        { LocationCode.MB, new[] { NativeLocationCode.CAN } },
        { LocationCode.NB, new[] { NativeLocationCode.CAN } },
        { LocationCode.NL, new[] { NativeLocationCode.CAN } },
        { LocationCode.NT, new[] { NativeLocationCode.CAN } },
        { LocationCode.NS, new[] { NativeLocationCode.CAN } },
        { LocationCode.NU, new[] { NativeLocationCode.CAN } },
        { LocationCode.ON, new[] { NativeLocationCode.CAN } },
        { LocationCode.PE, new[] { NativeLocationCode.CAN } },
        { LocationCode.QC, new[] { NativeLocationCode.CAN } },
        { LocationCode.SK, new[] { NativeLocationCode.CAN } },
        { LocationCode.YT, new[] { NativeLocationCode.CAN } },
        { LocationCode.NF, new[] { NativeLocationCode.CAN } },
        { LocationCode.LB, new[] { NativeLocationCode.CAN } }
    }.ToFrozenDictionary();

        static FileService()
        {
            string dirName = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data");
            string photosPath = Path.Combine(dirName, "sorted_photos.csv");
            _photoFileHandle = File.OpenHandle(photosPath, FileMode.Open, FileAccess.Read, FileShare.Read, options: FileOptions.RandomAccess);
            string observersPath = Path.Combine(dirName, "observers.csv");
            string taxonsPath = Path.Combine(dirName, "taxonMapping.csv");
            ParseSymbolOffsets(photosPath);
            ParseObservers(observersPath);
            ParseTaxons(taxonsPath);
            List<PlantDataRow> rows = ParsePlantDataRow(dirName);
            Dictionary<string, ExtraInfo> extraInfo = ParseExtraInfo(dirName);

            PlantDataRow[] filteredRows = [
                    .. rows.Where(p =>
                        {
                            string[]? words = p.ScientificName?
                                .Split(' ');

                            return words?.Length >= MinimumSpeciesNameWords
                                && !p.GrowthHabit.Contains(GrowthHabit.Lichenous)
                                && p.NativeStateAndProvinceCodes.Count != 0;
                        })
                        //Group by base species(first 2 words)
                       .GroupBy(p => String.Join(' ', p.ScientificName.Split(' ').Take(2)))
                       // Choose subspecies or full group
                       .SelectMany(group =>
                       {
                           IEnumerable<PlantDataRow> subspecies = group
                               .Where(p => SCIENTIFIC_NAME_SPLIT().IsMatch(p.ScientificName));

                           return subspecies.Any() ? subspecies : group;
                       })
                ];

            PlantData[] data = [.. filteredRows.Select(row =>
            {
                extraInfo.TryGetValue(row.Symbol, out var info);
                return info != null
                    ? new PlantData(row, info.CommonName, info.CombinedFIPs)
                    : new PlantData(row, null, []);
            })];

            PlantData = new PlantData[data.Length];
            data.CopyTo(PlantData);

            var dict = new Dictionary<string, PlantData>();
            var plantDict = new Dictionary<string, HashSet<PlantData>>();
            foreach (PlantData datum in data)
            {
                foreach (string fip in datum.CombinedCountyFIPs)
                {
                    if (!plantDict.ContainsKey(fip))
                        plantDict[fip] = [];
                    plantDict[fip].Add(datum);
                    // Add state fip
                    //PlantsByLocation[fip[..2]].Add(datum);
                }
                dict.Add(datum.AcceptedSymbol, datum);
            }
            AcceptedSymbolToPlant = dict.ToFrozenDictionary();
            PlantsByLocation = plantDict.ToFrozenDictionary();
        }


        public static PlantData[] GetSortedPlants(SortOption sortOption, bool ascending)
        {
            Func<PlantData, string?> keySelector = sortOption switch
            {
                SortOption.CommonName => p => p.CommonName,
                SortOption.ScientificName => p => p.ScientificName,
                SortOption.Symbol => p => p.Symbol,
                _ => p => p.ScientificName
            };
            return ascending
                ? [.. PlantData.OrderBy(keySelector)]
                : [.. PlantData.OrderByDescending(keySelector)];
        }

        public static HashSet<PlantData>? GetPlantsByLocation(string combinedFIP)
        {
            return PlantsByLocation.GetValueOrDefault(combinedFIP);
        }

        private static List<PlantDataRow> ParsePlantDataRow(string dirName)
        {
            string fileName = Path.Combine(dirName, "PLANTS_Characteristics_Plus_Data.csv");
            using TextFieldParser parser = new(fileName)
            {
                TextFieldType = FieldType.Delimited,
                Delimiters = [","],
                HasFieldsEnclosedInQuotes = true,
            };

            List<PlantDataRow> data = [];

            parser.ReadLine();
            while (!parser.EndOfData)
            {
                PlantDataRow row = GetPlantDataRow(parser);
                data.Add(row);
            }

            return data;
        }

        private static void ParseObservers(string observersPath)
        {
            var dict = new Dictionary<long, Observer>();
            foreach (string line in File.ReadLines(observersPath).Skip(1))
            {
                string[] fields = line.Split('\t');
                if (fields.Length >= 1 && long.TryParse(fields[0], out long observerId))
                {
                    dict[observerId] = new Observer(
                    fields.Length >= 2 ? fields[1] : "",
                    fields.Length >= 3 ? fields[2] : ""
                );
                }
            }
            ObserversById = dict.ToFrozenDictionary();
        }


        private static void ParseTaxons(string taxonsPath)
        {
            var dict = new Dictionary<string, string>();
            foreach (string line in File.ReadLines(taxonsPath).Skip(1))
            {
                string[] fields = line.Split(',');
                if (fields.Length >= 1) dict.Add(fields[0].Trim('"'), fields[1].Trim('"'));
            }

            AcceptedSymbolToTaxonId = dict.ToFrozenDictionary();
        }

        private static void ParseSymbolOffsets(string photosPath)
        {
            long offset = 0;
            string? currentSymbol = null;
            long symbolStartOffset = 0;
            int lineEndingBytes = GetLineEndingBytes(photosPath);
            var dict = new Dictionary<string, (long FirstOffset, long TotalBytes)>();

            foreach (string line in File.ReadLines(photosPath))
            {
                long lineBytes = Encoding.UTF8.GetByteCount(line) + lineEndingBytes;
                if (offset > 0) // skip header
                {
                    string symbol = line.Split(',')[1].Trim('"');
                    if (symbol != currentSymbol)
                    {
                        if (currentSymbol != null)
                            dict[currentSymbol] = (symbolStartOffset, offset - symbolStartOffset);
                        currentSymbol = symbol;
                        symbolStartOffset = offset;
                    }
                }
                offset += lineBytes;
            }

            // Finalize last symbol
            if (currentSymbol != null)
                dict[currentSymbol] = (symbolStartOffset, offset - symbolStartOffset);

            PhotoOffsetsBySymbol = dict.ToFrozenDictionary();
        }

        private static int GetLineEndingBytes(string csvPath)
        {
            using var sr = new StreamReader(csvPath);
            sr.ReadLine(); // read past first line
            if (sr.BaseStream.Position > 0)
            {
                sr.BaseStream.Seek(0, SeekOrigin.Begin);
                int b;
                while ((b = sr.BaseStream.ReadByte()) != -1)
                {
                    if (b == '\n') { return 1; }
                    if (b == '\r') { return 2; }
                }
            }

            return 1;
        }

        public static IEnumerable<Photo> GetPhotosForSymbol(string symbol)
        {
            if (_photoFileHandle is null || !PhotoOffsetsBySymbol.TryGetValue(symbol, out var entry))
                yield break;

            byte[] buffer = new byte[entry.TotalBytes];
            RandomAccess.Read(_photoFileHandle, buffer, entry.FirstOffset);
            foreach (string line in Encoding.UTF8.GetString(buffer).Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                string[] fields = line.Split(',');
                long observerId = long.Parse(fields[4].Trim('"', '\r'));
                Observer observer = ObserversById[observerId];
                yield return new Photo(
                    PhotoId: long.Parse(fields[0].Trim('"')),
                    AcceptedSymbol: fields[1].Trim('"'),
                    FullCredits: BuildFullCredits(observer, fields[2].Trim('"')),
                    Extension: fields[3].Trim('"'),
                    ObserverId: observerId
                );
            }
        }
        private static string BuildFullCredits(Observer observer, string license)
        {
            string credit = !string.IsNullOrEmpty(observer.Name) ? observer.Name
                          : !string.IsNullOrEmpty(observer.Login) ? observer.Login
                          : "Unknown";

            return $"© {credit} / iNaturalist ({license.ToUpperInvariant()})";
        }

        private static PlantDataRow GetPlantDataRow(TextFieldParser parser)
        {
            string?[] fields = parser.ReadFields()!;
            HashSet<LocationCode> stateAndProvinceSet = GetStateAndProvinceSet(fields[5]);
            HashSet<LocationCode> nativeLocations = [];
            string? nativeStatusField = fields[10];

            foreach (ValueMatch x in NATIVE_STATUS().EnumerateMatches(nativeStatusField))
            {
                if (nativeStatusField![x.Index + x.Length - 2] != 'N') continue;

                NativeLocationCode location = Enum.Parse<NativeLocationCode>(nativeStatusField.Substring(x.Index, x.Length - 3));
                if (location == NativeLocationCode.NA && x.Length == nativeStatusField.Length)
                {
                    nativeLocations = [.. Enum.GetValues<LocationCode>()];
                }
                else if (location == NativeLocationCode.NA)
                {
                    // TODO ? 
                    continue;
                }
                else
                {
                    nativeLocations.UnionWith(stateAndProvinceSet.Where(x => _LocationToNativeRegion[x].Contains(location)));
                }
            }

            return new()
            {
                AcceptedSymbol = fields[0]!,
                SynonymSymbol = fields[1],
                Symbol = fields[2]!,
                ScientificName = fields[3]!,
                PlantsFlorisiticArea = fields[4],
                StateAndProvince = stateAndProvinceSet,
                Category = ParseEnum<Category>(fields[6]),
                Family = fields[7],
                Duration = ParseEnumHashSet<Duration>(fields[8]), // TODO this is parsing the earlier fields as this value
                GrowthHabit = ParseEnumHashSet<GrowthHabit>(fields[9]),
                NativeStateAndProvinceCodes = nativeLocations,
                CharacteristicsData = fields[11] == "No" ? false : true,
                ActiveGrowthPeriod = String.IsNullOrWhiteSpace(fields[12]) ? [] : [.. fields[12]!.Trim('"').Split([",", " and "], StringSplitOptions.TrimEntries).Select(x => ParseEnum<Season>(x)).OfType<Season>()],
                AfterHarvestRegrowthRate = ParseEnum<Rate>(fields[13]),
                Bloat = ParseEnum<Level>(fields[14]),
                CNRatio = ParseEnum<Level>(fields[15]),
                CoppicePotential = ParseBool(fields[16]),
                FallConspicuous = ParseBool(fields[17]),
                FireResistance = ParseBool(fields[18]),
                FlowerColor = ParseEnum<Color>(fields[19]),
                FlowerConspicuous = ParseBool(fields[20]),
                FoliageColor = ParseEnum<Color>(fields[21]),
                FoliagePorositySummer = ParseEnum<Porosity>(fields[22]),
                FoliagePorosityWinter = ParseEnum<Porosity>(fields[23]),
                FoliageTexture = ParseEnum<Texture>(fields[24]),
                FruitColor = ParseEnum<Color>(fields[25]),
                FruitConspicuous = ParseBool(fields[26]),
                GrowthForm = ParseEnum<GrowthForm>(fields[27]),
                GrowthRate = ParseEnum<Rate>(fields[28]),
                HeightAtBaseAgeMaximumFeet = String.IsNullOrWhiteSpace(fields[29]) ? null : double.Parse(fields[29]),
                HeightMatureFeet = String.IsNullOrWhiteSpace(fields[30]) ? null : double.Parse(fields[30]),
                KnownAllelopath = ParseBool(fields[31]),
                LeafRetention = ParseBool(fields[32]),
                Lifespan = ParseEnum<Lifespan>(fields[33]),
                LowGrowingGrass = ParseBool(fields[34]),
                NitrogenFixation = ParseEnum<Level>(fields[35]),
                Resproutability = ParseBool(fields[36]),
                ShapeAndOrientation = ParseEnum<ShapeAndOrientation>(fields[37]),
                Toxicity = ParseEnum<Toxicity>(fields[38]),
                AdaptedToCoarseTexturedSoils = ParseBool(fields[39]),
                AdaptedToMediumTexturedSoils = ParseBool(fields[40]),
                AdaptedToFineTexturedSoils = ParseBool(fields[41]),
                AnaerobicTolerance = ParseEnum<Level>(fields[42]),
                Caco3Tolerance = ParseEnum<Level>(fields[43]),
                ColdStratificationRequired = ParseBool(fields[44]),
                DroughtTolerance = ParseEnum<Level>(fields[45]),
                FertilityRequirement = ParseEnum<Level>(fields[46]),
                FireTolerance = ParseEnum<Level>(fields[47]),
                FrostFreeDaysMinimum = String.IsNullOrWhiteSpace(fields[48]) ? null : double.Parse(fields[48]),
                HedgeTolerance = ParseEnum<Level>(fields[49]),
                MoistureUse = ParseEnum<Level>(fields[50]),
                PhMinimum = String.IsNullOrWhiteSpace(fields[51]) ? null : double.Parse(fields[51]),
                PhMaximum = String.IsNullOrWhiteSpace(fields[52]) ? null : double.Parse(fields[52]),
                PlantingDensityPerAcreMinimum = String.IsNullOrWhiteSpace(fields[53]) ? null : double.Parse(fields[53]),
                PlantingDensityPerAcreMaximum = String.IsNullOrWhiteSpace(fields[54]) ? null : double.Parse(fields[54]),
                PrecipitationMinimum = String.IsNullOrWhiteSpace(fields[55]) ? null : double.Parse(fields[55]),
                PrecipitationMaximum = String.IsNullOrWhiteSpace(fields[56]) ? null : double.Parse(fields[56]),
                RootDepthMinimumInches = String.IsNullOrWhiteSpace(fields[57]) ? null : double.Parse(fields[57]),
                SalinityTolerance = ParseEnum<Level>(fields[58]),
                ShadeTolerance = ParseEnum<ShadeTolerance>(fields[59]),
                TemperatureMinimumF = String.IsNullOrWhiteSpace(fields[60]) ? null : double.Parse(fields[60]),
                BloomPeriod = fields[61],
                CommercialAvailability = ParseEnum<CommercialAvailability>(fields[62]),
                FruitSeedAbundance = ParseEnum<Level>(fields[63]),
                FruitSeedPeriodBegin = ParseEnum<Season>(fields[64]),
                FruitSeedPeriodEnd = ParseEnum<Season>(fields[65]),
                FruitSeedPersistence = ParseBool(fields[66]),
                PropogatedByBareRoot = ParseBool(fields[67]),
                PropogatedByBulbs = ParseBool(fields[68]),
                PropogatedByContainer = ParseBool(fields[69]),
                PropogatedByCorms = ParseBool(fields[70]),
                PropogatedByCuttings = ParseBool(fields[71]),
                PropogatedBySeed = ParseBool(fields[72]),
                PropogatedBySod = ParseBool(fields[73]),
                PropogatedBySprigs = ParseBool(fields[74]),
                PropogatedByTubers = ParseBool(fields[75]),
                SeedsPerPound = String.IsNullOrWhiteSpace(fields[76]) ? null : double.Parse(fields[76]),
                SeedSpreadRate = ParseEnum<Rate>(fields[77]),
                SeedlingVigor = ParseEnum<Level>(fields[78]),
                SmallGrain = ParseBool(fields[79]),
                VegetativeSpreadRate = ParseEnum<Rate>(fields[80]),
                BerryNutSeedProduct = ParseBool(fields[81]),
                ChristmasTreeProduct = ParseBool(fields[82]),
                FodderProduct = ParseBool(fields[83]),
                FuelwoodProduct = ParseEnum<Level>(fields[84]),
                LumberProduct = ParseBool(fields[85]),
                NavalStoreProduct = ParseBool(fields[86]),
                NurseryStockProduct = ParseBool(fields[87]),
                PalatableBrowseAnimal = ParseEnum<Level>(fields[88]),
                PalatableGrazeAnimal = ParseEnum<Level>(fields[89]),
                PalatableHuman = ParseBool(fields[90]),
                PostProduct = ParseBool(fields[91]),
                ProteinPotential = ParseEnum<Level>(fields[92]),
                PulpwoodProduct = ParseBool(fields[93]),
                VeneerProduct = ParseBool(fields[94]),
            };
        }

        private static bool? ParseBool(string? field) => String.IsNullOrWhiteSpace(field) ? null : field != "No";

        private static HashSet<LocationCode> GetStateAndProvinceSet(string? stateAndProvince)
        {
            HashSet<LocationCode> stateAndProvinceSet = [];
            if (!String.IsNullOrWhiteSpace(stateAndProvince))
            {
                // TODO No support for FRA(SB) i believe french colony, i think gl is greenland
                stateAndProvince = stateAndProvince.Replace("FRA(SB)", "").Replace("DEN(GL)", "");
                string v = GROWTH_HABIT_USA_CAN().Replace(stateAndProvince, match => match.Groups[1].Value);

                stateAndProvinceSet = [.. Regex.Replace(v, @"\s", "").Split(',', StringSplitOptions.RemoveEmptyEntries).Select(x => ParseEnum<LocationCode>(x)).OfType<LocationCode>()];
            }

            return stateAndProvinceSet;
        }


        // --- Core attribute-aware parse ---
        private static TEnum ParseEnumInternal<TEnum>(string value)
            where TEnum : struct, IConvertible, IComparable, IFormattable
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentNullException(nameof(value));

            Type? type = typeof(TEnum);
            foreach (var field in type.GetFields(BindingFlags.Public | BindingFlags.Static))
            {
                var attr = field.GetCustomAttribute<EnumMemberAttribute>();
                if (attr != null && attr.Value == value)
                    return (TEnum)field.GetValue(null)!;

                if (field.Name == value)
                    return (TEnum)field.GetValue(null)!;
            }

            // fallback to standard Enum.Parse (in case casing or numeric string)
            return (TEnum)Enum.Parse(type, value, ignoreCase: true);
        }


        private static TEnum? ParseEnum<TEnum>(string? field) where TEnum : struct, IConvertible, IComparable, IFormattable => String.IsNullOrWhiteSpace(field) ? null : ParseEnumInternal<TEnum>(field.Trim());
        private static HashSet<TEnum> ParseEnumHashSet<TEnum>(string? field) where TEnum : struct, IConvertible, IComparable, IFormattable => String.IsNullOrWhiteSpace(field.Trim()) ? [] : ParseCsvList<TEnum>(field.Trim());
        private static HashSet<TEnum> ParseCsvList<TEnum>(string field) where TEnum : struct, IConvertible, IComparable, IFormattable => [.. field.Trim('"').Split(',', StringSplitOptions.RemoveEmptyEntries).Select(x => ParseEnumInternal<TEnum>(x.Trim())).Order()];



        private static Dictionary<string, ExtraInfo> ParseExtraInfo(string dirName)
        {
            string fileName = Path.Combine(dirName, "PLANTS_EXTRA_DATA.csv");
            Dictionary<string, ExtraInfo> items = [];

            using TextFieldParser parser = new(fileName)
            {
                Delimiters = [","],
                HasFieldsEnclosedInQuotes = true,
            };
            // Skip Header
            parser.ReadLine();
            while (!parser.EndOfData)
            {
                string[] fields = parser.ReadFields()!;
                string symbol = fields[0];
                string commonName = fields[1];
                string counties = fields[2];
                HashSet<string> countySet = [.. counties.Split('|')];
                items.Add(symbol, new ExtraInfo(countySet, commonName));
            }

            return items;
        }


        [GeneratedRegex(@"(?:USA|CAN)\+?\s?\(([^)]+)\)")]
        private static partial Regex GROWTH_HABIT_USA_CAN();

        [GeneratedRegex(@"([A-Z0-9]+)\((N)\)")]
        private static partial Regex NATIVE_STATUS();
        [GeneratedRegex(@"\b(subsp\.|var\.|f\.)\b")]
        private static partial Regex SCIENTIFIC_NAME_SPLIT();
    }
}
