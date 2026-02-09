using api.DTOs;

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
            var response = BuildErrorResponse(context, ex);

            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.StatusCode = response.Status;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(response);
        }
    }

    private ErrorResponseDto BuildErrorResponse(HttpContext context, Exception exception)
    {
        if (exception is HttpRequestException httpRequestException)
        {
            _logger.LogWarning(exception, "Upstream HTTP exception.");

            var status = httpRequestException.StatusCode.HasValue
                ? (int)httpRequestException.StatusCode.Value
                : StatusCodes.Status502BadGateway;
            if (status is < 400 or > 599)
            {
                status = StatusCodes.Status502BadGateway;
            }

            return new ErrorResponseDto
            {
                Error = BuildHttpRequestMessage(httpRequestException, status),
                Code = status switch
                {
                    StatusCodes.Status400BadRequest => "bad_request",
                    StatusCodes.Status401Unauthorized => "unauthorized",
                    StatusCodes.Status403Forbidden => "forbidden",
                    StatusCodes.Status404NotFound => "not_found",
                    StatusCodes.Status409Conflict => "conflict",
                    StatusCodes.Status429TooManyRequests => "rate_limited",
                    _ => "upstream_error",
                },
                Status = status,
                TraceId = context.TraceIdentifier,
            };
        }

        if (exception is ArgumentException or InvalidOperationException)
        {
            _logger.LogWarning(exception, "Request validation/processing exception.");
            return new ErrorResponseDto
            {
                Error = string.IsNullOrWhiteSpace(exception.Message)
                    ? "Invalid request."
                    : exception.Message.Trim(),
                Code = "bad_request",
                Status = StatusCodes.Status400BadRequest,
                TraceId = context.TraceIdentifier,
            };
        }

        _logger.LogError(exception, "Unhandled server exception.");
        return new ErrorResponseDto
        {
            Error = "Internal server error.",
            Code = "internal_error",
            Status = StatusCodes.Status500InternalServerError,
            TraceId = context.TraceIdentifier,
        };
    }

    private static string BuildHttpRequestMessage(HttpRequestException exception, int status)
    {
        if (!string.IsNullOrWhiteSpace(exception.Message))
        {
            return exception.Message.Trim();
        }

        return status switch
        {
            StatusCodes.Status400BadRequest => "Invalid request to upstream map service.",
            StatusCodes.Status403Forbidden => "Map service denied the request.",
            StatusCodes.Status429TooManyRequests => "Map service rate limit exceeded.",
            _ => "Failed to process request with upstream map service.",
        };
    }
}
