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
        private static JsonSerializerOptions _options = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        [HttpGet("plantdata")]
        public async Task GetPlantDataAsync([FromQuery] int batchSize, CancellationToken cancellationToken)
        {
            List<PlantData> batch = new(batchSize);
            await foreach (var item in FileService.PlantData.ToAsyncEnumerable().WithCancellation(cancellationToken))
            {
                batch.Add(item);
                if (batch.Count == batchSize)
                {
                    await JsonSerializer.SerializeAsync(Response.Body, batch, options: new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }, cancellationToken: cancellationToken);
                    await Response.WriteAsync(newLine, cancellationToken: cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken: cancellationToken);
                    batch.Clear();
                }
            }

            if (batch.Count > 0)
            {
                await JsonSerializer.SerializeAsync(Response.Body, batch, options: new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }, cancellationToken: cancellationToken);
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
            // Get county plants as a HashSet for O(1) lookups
            HashSet<PlantData>? countyPlants = FileService.GetCountyPlants(combinedFIP);
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

            List<PlantData> batch = new(batchSize);
            foreach (var item in filtered)
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

        [HttpGet("plantdata/id")]
        public async IAsyncEnumerable<string> GetPlantDataIdsAsync([EnumeratorCancellation] CancellationToken cancellationToken)
        {
            await foreach (PlantData item in FileService.PlantData.ToAsyncEnumerable().WithCancellation(cancellationToken))
                yield return item.AcceptedSymbol;
        }
    }
}
