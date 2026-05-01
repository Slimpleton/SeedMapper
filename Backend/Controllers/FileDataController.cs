using Backend.ModelBinders;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using System.Runtime.CompilerServices;
using System.Text.Json;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FileDataController : ControllerBase
    {
        private const string newLine = "\n";
        private static readonly JsonSerializerOptions _options = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        [HttpGet("plantdata")]
        public async Task GetPlantDataAsync([FromQuery] int batchSize, CancellationToken cancellationToken)
        {
            List<PlantData> batch = new(batchSize);
            await foreach (var item in FileService.PlantData.ToAsyncEnumerable().WithCancellation(cancellationToken))
            {
                batch.Add(item);
                if (batch.Count == batchSize)
                {
                    await JsonSerializer.SerializeAsync(Response.Body, batch, options: _options, cancellationToken: cancellationToken);
                    await Response.WriteAsync(newLine, cancellationToken: cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken: cancellationToken);
                    batch.Clear();
                }
            }

            if (batch.Count > 0)
            {
                await JsonSerializer.SerializeAsync(Response.Body, batch, options: _options, cancellationToken: cancellationToken);
                await Response.WriteAsync(newLine, cancellationToken: cancellationToken);
                await Response.Body.FlushAsync(cancellationToken: cancellationToken);
            }
        }

        [HttpGet("plantdata/{id}")]
        public async Task<PlantData?> GetPlantDataAsync(string id, CancellationToken cancellationToken)
        {
            return await FileService.PlantData.ToAsyncEnumerable().FirstOrDefaultAsync(x => x.AcceptedSymbol == id, cancellationToken: cancellationToken);
        }

        [HttpGet("plantdata/search")]
        public async Task SearchForPlantDataAsync([FromQuery] string combinedFIP, [FromQuery] string? searchString, [FromQuery] SortOption sortOption, [FromQuery] bool ascending, [FromQuery] int batchSize, [FromQuery, ModelBinder(BinderType = typeof(GrowthHabitModelBinder))] GrowthHabit? growthHabit, [FromQuery, ModelBinder(BinderType = typeof(DurationModelBinder))] Duration? duration, CancellationToken cancellationToken)
        {
            int secondaryBatchSize = 500;
            // Get county plants as a HashSet for O(1) lookups
            HashSet<PlantData>? countyPlants = FileService.GetPlantsByLocation(combinedFIP);
            if (countyPlants == null)
                return;  // County not found, return empty


            IEnumerable<PlantData> filtered = FileService.GetSortedPlants(sortOption, ascending);
            filtered = filtered.Where(countyPlants.Contains);
            if (growthHabit != null && growthHabit != GrowthHabit.Any)
                filtered = filtered.Where(x => x.GrowthHabit.Contains((GrowthHabit)growthHabit));

            if (duration is not null and not Duration.Any)
                filtered = duration is Duration.AN or Duration.Annual
                    ? filtered.Where(x => x.Duration.Contains(Duration.AN) || x.Duration.Contains(Duration.Annual))
                    : filtered.Where(x => x.Duration.Contains((Duration)duration));

            if (!String.IsNullOrWhiteSpace(searchString))
                filtered = filtered.Where(x => x.ScientificName.Contains(searchString, StringComparison.OrdinalIgnoreCase) || (x.CommonName != null && x.CommonName.Contains(searchString, StringComparison.OrdinalIgnoreCase)));

            List<PlantDataDTO> batch = new(batchSize);
            bool firstBatch = true;
            foreach (var item in filtered)
            {
                var photos = FileService.GetPhotosForSymbol(item.AcceptedSymbol)?.ToList() ?? [];
                var dto = new PlantDataDTO
                {
                    AcceptedSymbol = item.AcceptedSymbol,
                    SynonymSymbol = item.SynonymSymbol,
                    Symbol = item.Symbol,
                    ScientificName = item.ScientificName,
                    PlantsFlorisiticArea = item.PlantsFlorisiticArea,
                    StateAndProvince = item.StateAndProvince,
                    Category = item.Category,
                    Family = item.Family,
                    Duration = item.Duration,
                    GrowthHabit = item.GrowthHabit,
                    NativeStateAndProvinceCodes = item.NativeStateAndProvinceCodes,
                    CharacteristicsData = item.CharacteristicsData,
                    ActiveGrowthPeriod = item.ActiveGrowthPeriod,
                    AfterHarvestRegrowthRate = item.AfterHarvestRegrowthRate,
                    Bloat = item.Bloat,
                    CNRatio = item.CNRatio,
                    CoppicePotential = item.CoppicePotential,
                    FallConspicuous = item.FallConspicuous,
                    FireResistance = item.FireResistance,
                    FlowerColor = item.FlowerColor,
                    FlowerConspicuous = item.FlowerConspicuous,
                    FoliageColor = item.FoliageColor,
                    FoliagePorosityWinter = item.FoliagePorosityWinter,
                    FoliagePorositySummer = item.FoliagePorositySummer,
                    FoliageTexture = item.FoliageTexture,
                    FruitColor = item.FruitColor,
                    FruitConspicuous = item.FruitConspicuous,
                    GrowthForm = item.GrowthForm,
                    GrowthRate = item.GrowthRate,
                    HeightAtBaseAgeMaximumFeet = item.HeightAtBaseAgeMaximumFeet,
                    HeightMatureFeet = item.HeightMatureFeet,
                    KnownAllelopath = item.KnownAllelopath,
                    LeafRetention = item.LeafRetention,
                    Lifespan = item.Lifespan,
                    LowGrowingGrass = item.LowGrowingGrass,
                    NitrogenFixation = item.NitrogenFixation,
                    Resproutability = item.Resproutability,
                    ShapeAndOrientation = item.ShapeAndOrientation,
                    Toxicity = item.Toxicity,
                    AdaptedToCoarseTexturedSoils = item.AdaptedToCoarseTexturedSoils,
                    AdaptedToMediumTexturedSoils = item.AdaptedToMediumTexturedSoils,
                    AdaptedToFineTexturedSoils = item.AdaptedToFineTexturedSoils,
                    AnaerobicTolerance = item.AnaerobicTolerance,
                    Caco3Tolerance = item.Caco3Tolerance,
                    ColdStratificationRequired = item.ColdStratificationRequired,
                    DroughtTolerance = item.DroughtTolerance,
                    FertilityRequirement = item.FertilityRequirement,
                    FireTolerance = item.FireTolerance,
                    FrostFreeDaysMinimum = item.FrostFreeDaysMinimum,
                    HedgeTolerance = item.HedgeTolerance,
                    MoistureUse = item.MoistureUse,
                    PhMinimum = item.PhMinimum,
                    PhMaximum = item.PhMaximum,
                    PlantingDensityPerAcreMinimum = item.PlantingDensityPerAcreMinimum,
                    PlantingDensityPerAcreMaximum = item.PlantingDensityPerAcreMaximum,
                    PrecipitationMinimum = item.PrecipitationMinimum,
                    PrecipitationMaximum = item.PrecipitationMaximum,
                    RootDepthMinimumInches = item.RootDepthMinimumInches,
                    SalinityTolerance = item.SalinityTolerance,
                    ShadeTolerance = item.ShadeTolerance,
                    TemperatureMinimumF = item.TemperatureMinimumF,
                    BloomPeriod = item.BloomPeriod,
                    CommercialAvailability = item.CommercialAvailability,
                    FruitSeedAbundance = item.FruitSeedAbundance,
                    FruitSeedPeriodBegin = item.FruitSeedPeriodBegin,
                    FruitSeedPeriodEnd = item.FruitSeedPeriodEnd,
                    FruitSeedPersistence = item.FruitSeedPersistence,
                    PropogatedByBareRoot = item.PropogatedByBareRoot,
                    PropogatedByBulbs = item.PropogatedByBulbs,
                    PropogatedByContainer = item.PropogatedByContainer,
                    PropogatedByCorms = item.PropogatedByCorms,
                    PropogatedByCuttings = item.PropogatedByCuttings,
                    PropogatedBySeed = item.PropogatedBySeed,
                    PropogatedBySod = item.PropogatedBySod,
                    PropogatedBySprigs = item.PropogatedBySprigs,
                    PropogatedByTubers = item.PropogatedByTubers,
                    SeedsPerPound = item.SeedsPerPound,
                    SeedSpreadRate = item.SeedSpreadRate,
                    SeedlingVigor = item.SeedlingVigor,
                    SmallGrain = item.SmallGrain,
                    VegetativeSpreadRate = item.VegetativeSpreadRate,
                    BerryNutSeedProduct = item.BerryNutSeedProduct,
                    ChristmasTreeProduct = item.ChristmasTreeProduct,
                    FodderProduct = item.FodderProduct,
                    FuelwoodProduct = item.FuelwoodProduct,
                    LumberProduct = item.LumberProduct,
                    NavalStoreProduct = item.NavalStoreProduct,
                    NurseryStockProduct = item.NurseryStockProduct,
                    PalatableBrowseAnimal = item.PalatableBrowseAnimal,
                    PalatableGrazeAnimal = item.PalatableGrazeAnimal,
                    PalatableHuman = item.PalatableHuman,
                    PostProduct = item.PostProduct,
                    ProteinPotential = item.ProteinPotential,
                    PulpwoodProduct = item.PulpwoodProduct,
                    VeneerProduct = item.VeneerProduct,
                    CommonName = item.CommonName,
                    CombinedCountyFIPs = item.CombinedCountyFIPs,
                    Photos = [.. photos],
                };

                batch.Add(dto);

                batchSize = firstBatch ? batchSize : secondaryBatchSize;

                if (batch.Count == batchSize)
                {
                    await JsonSerializer.SerializeAsync(Response.Body, batch, options: _options, cancellationToken: cancellationToken);
                    await Response.WriteAsync(newLine, cancellationToken: cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken: cancellationToken);
                    batch.Clear();
                    firstBatch = false;
                }
            }

            if (batch.Count > 0)
            {
                await JsonSerializer.SerializeAsync(Response.Body, batch, options: _options, cancellationToken: cancellationToken);
                await Response.WriteAsync(newLine, cancellationToken: cancellationToken);
                await Response.Body.FlushAsync(cancellationToken: cancellationToken);
            }
        }

        [HttpGet("plantdata/id")]
        public async IAsyncEnumerable<string> GetPlantDataIdsAsync([EnumeratorCancellation] CancellationToken cancellationToken)
        {
            await foreach (PlantData item in FileService.PlantData.ToAsyncEnumerable().WithCancellation(cancellationToken))
                yield return item.AcceptedSymbol;
        }
    }
}
