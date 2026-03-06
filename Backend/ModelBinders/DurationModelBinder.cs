using Backend.Models;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Backend.ModelBinders
{
    public class DurationModelBinder : IModelBinder
    {
        public Task BindModelAsync(ModelBindingContext bindingContext)
        {
            var value = bindingContext.ValueProvider.GetValue(bindingContext.ModelName).FirstValue;
            if (string.IsNullOrWhiteSpace(value))
            {
                bindingContext.Result = ModelBindingResult.Success(null);
                return Task.CompletedTask;
            }

            Duration result;

            if (value == Duration.AN.ToString() || value == Duration.Annual.ToString())
            {
                result = Duration.Annual;
            }
            else if (!Enum.TryParse(value, ignoreCase: true, out result))
            {
                bindingContext.ModelState.AddModelError(bindingContext.ModelName, $"Invalid Duration: {value}");
                bindingContext.Result = ModelBindingResult.Failed();
                return Task.CompletedTask;
            }

            bindingContext.Result = ModelBindingResult.Success(result);
            return Task.CompletedTask;
        }
    }
}

