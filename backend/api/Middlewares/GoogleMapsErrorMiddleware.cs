namespace api.Middlewares;

public class GoogleMapsErrorMiddleware(RequestDelegate next, ILogger<GoogleMapsErrorMiddleware> logger)
{
    private readonly RequestDelegate _next = next;
    private readonly ILogger<GoogleMapsErrorMiddleware> _logger = logger;

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (GoogleMapsApiException ex)
        {
            _logger.LogWarning(ex, "Google Maps API failure.");
            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.StatusCode = ex.StatusCode;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                error = ex.Message,
                source = "google-maps",
            });
        }
    }
}
