using Backend.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Backend.ModelBinders
{
    public class ColorModelBinder : IModelBinder
    {
        public Task BindModelAsync(ModelBindingContext bindingContext)
        {
            var value = bindingContext.ValueProvider.GetValue(bindingContext.ModelName).FirstValue;
            if (string.IsNullOrWhiteSpace(value))
            {
                bindingContext.Result = ModelBindingResult.Success(null);
                return Task.CompletedTask;
            }

            Color result;

            var mapped = value switch
            {
                "Dark Green" => Color.DarkGreen,
                "Gray-Green" => Color.GrayGreen,
                "White-Gray" => Color.WhiteGray,
                "Yellow-Green" => Color.YellowGreen,
                _ => (Color?)null
            };

            if (mapped.HasValue)
            {
                bindingContext.Result = ModelBindingResult.Success(mapped.Value);
                return Task.CompletedTask;
            }
            else if (!Enum.TryParse(value, ignoreCase: true, out result))
            {
                bindingContext.ModelState.AddModelError(bindingContext.ModelName, $"Invalid Color: {value}");
                bindingContext.Result = ModelBindingResult.Failed();
                return Task.CompletedTask;
            }

            bindingContext.Result = ModelBindingResult.Success(result);
            return Task.CompletedTask;
        }
    }
}

