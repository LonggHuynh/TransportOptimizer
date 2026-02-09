namespace api.Middlewares;

public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    private readonly RequestDelegate _next = next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger = logger;

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var responseStatusCode = StatusCodes.Status500InternalServerError;
            var responseMessage = "Internal server error.";

            if (ex is HttpRequestException httpRequestException)
            {
                var statusCode = httpRequestException.StatusCode.HasValue
                    ? (int)httpRequestException.StatusCode.Value
                    : StatusCodes.Status502BadGateway;
                responseStatusCode = statusCode is >= 400 and <= 599
                    ? statusCode
                    : StatusCodes.Status502BadGateway;
                if (!string.IsNullOrWhiteSpace(httpRequestException.Message))
                {
                    responseMessage = httpRequestException.Message;
                }

                _logger.LogWarning(ex, "Upstream HTTP exception.");
            }
            else
            {
                _logger.LogError(ex, "Unhandled server exception.");
            }

            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.StatusCode = responseStatusCode;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                error = responseMessage,
            });
        }
    }
}
