using System.Net;
using System.Text;
using System.Text.Json;

namespace api.Externals.Handlers;

public class GoogleMapsErrorHandler : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {

        var response = await base.SendAsync(request, cancellationToken);
        var payload = response.Content is null
            ? null
            : await response.Content.ReadAsByteArrayAsync(cancellationToken);
        var body = payload is { Length: > 0 } ? Encoding.UTF8.GetString(payload) : null;
        RestoreContent(response, payload);
        var (googleStatus, googleErrorMessage) = ParseGoogleStatusAndErrorMessage(body);
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                BuildHttpFailureMessage((int)response.StatusCode, googleStatus, googleErrorMessage, body),
                null,
                response.StatusCode
            );
        }

        if (string.IsNullOrWhiteSpace(googleStatus) || string.Equals(googleStatus, "OK", StringComparison.OrdinalIgnoreCase))
        {
            return response;
        }

        var normalizedStatus = googleStatus.ToUpperInvariant();
        var statusCode = MapGoogleStatusToHttpStatus(normalizedStatus);
        throw new HttpRequestException(
            BuildStatusFailureMessage(normalizedStatus, googleErrorMessage),
            null,
            statusCode
        );
    }

    private static void RestoreContent(HttpResponseMessage response, byte[]? payload)
    {
        if (payload is null || response.Content is null)
        {
            return;
        }

        var restoredContent = new ByteArrayContent(payload);
        foreach (var header in response.Content.Headers)
        {
            restoredContent.Headers.TryAddWithoutValidation(header.Key, header.Value);
        }

        response.Content = restoredContent;
    }


    private static (string? Status, string? ErrorMessage) ParseGoogleStatusAndErrorMessage(string? body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return (null, null);
        }

        try
        {
            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
            {
                return (null, null);
            }

            string? status = null;
            string? errorMessage = null;

            if (root.TryGetProperty("status", out var statusElement) && statusElement.ValueKind == JsonValueKind.String)
            {
                status = statusElement.GetString();
            }

            if (root.TryGetProperty("error_message", out var errorMessageElement) && errorMessageElement.ValueKind == JsonValueKind.String)
            {
                errorMessage = errorMessageElement.GetString();
            }

            if (root.TryGetProperty("message", out var topMessageElement) && topMessageElement.ValueKind == JsonValueKind.String)
            {
                errorMessage ??= topMessageElement.GetString();
            }

            if (root.TryGetProperty("error", out var errorElement) && errorElement.ValueKind == JsonValueKind.Object)
            {
                if (errorElement.TryGetProperty("status", out var nestedStatusElement) && nestedStatusElement.ValueKind == JsonValueKind.String)
                {
                    status ??= nestedStatusElement.GetString();
                }

                if (errorElement.TryGetProperty("message", out var nestedMessageElement) && nestedMessageElement.ValueKind == JsonValueKind.String)
                {
                    errorMessage ??= nestedMessageElement.GetString();
                }
            }

            return (status, errorMessage);
        }
        catch (JsonException)
        {
            return (null, null);
        }
    }

    private static string BuildHttpFailureMessage(
        int statusCode,
        string? googleStatus,
        string? googleErrorMessage,
        string? responseBody
    )
    {
        if (!string.IsNullOrWhiteSpace(googleErrorMessage))
        {
            return googleErrorMessage;
        }

        if (!string.IsNullOrWhiteSpace(googleStatus))
        {
            return $"Upstream map service failed with status: {googleStatus}.";
        }

        var bodySnippet = BuildBodySnippet(responseBody);
        if (!string.IsNullOrWhiteSpace(bodySnippet))
        {
            return $"Upstream map service request failed with HTTP {statusCode}: {bodySnippet}";
        }

        return $"Upstream map service request failed with HTTP {statusCode}.";
    }

    private static string? BuildBodySnippet(string? responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return null;
        }

        var normalized = string.Join(
            " ",
            responseBody.Split(new[] { '\r', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(part => part.Trim())
                .Where(part => part.Length > 0)
        );
        if (normalized.Length == 0 || normalized.StartsWith('<'))
        {
            return null;
        }

        return normalized.Length > 280 ? $"{normalized[..280]}..." : normalized;
    }

    private static string BuildStatusFailureMessage(string googleStatus, string? googleErrorMessage)
    {
        if (!string.IsNullOrWhiteSpace(googleErrorMessage))
        {
            return googleErrorMessage;
        }

        return googleStatus switch
        {
            "INVALID_ARGUMENT" => "Upstream map service received an invalid request.",
            "PERMISSION_DENIED" => "Upstream map service denied the request.",
            "RESOURCE_EXHAUSTED" => "Upstream map service quota limit exceeded.",
            "UNAUTHENTICATED" => "Upstream map service authentication failed.",
            "REQUEST_DENIED" => "Upstream map service denied the request.",
            "OVER_QUERY_LIMIT" => "Upstream map service quota limit exceeded.",
            "OVER_DAILY_LIMIT" => "Upstream map service daily quota exceeded.",
            "INVALID_REQUEST" => "Upstream map service received an invalid request.",
            "MAX_ELEMENTS_EXCEEDED" => "Upstream map service request exceeds allowed size.",
            "UNKNOWN_ERROR" => "Upstream map service returned an unknown error.",
            _ => $"Upstream map service failed with status: {googleStatus}.",
        };
    }

    private static HttpStatusCode MapGoogleStatusToHttpStatus(string status)
    {
        return status switch
        {
            "INVALID_ARGUMENT" => HttpStatusCode.BadRequest,
            "PERMISSION_DENIED" => HttpStatusCode.Forbidden,
            "RESOURCE_EXHAUSTED" => HttpStatusCode.TooManyRequests,
            "UNAUTHENTICATED" => HttpStatusCode.Unauthorized,
            "REQUEST_DENIED" => HttpStatusCode.Forbidden,
            "OVER_QUERY_LIMIT" => HttpStatusCode.TooManyRequests,
            "OVER_DAILY_LIMIT" => HttpStatusCode.TooManyRequests,
            "INVALID_REQUEST" => HttpStatusCode.BadRequest,
            "MAX_ELEMENTS_EXCEEDED" => HttpStatusCode.BadRequest,
            "UNKNOWN_ERROR" => HttpStatusCode.BadGateway,
            _ => HttpStatusCode.BadGateway,
        };
    }
}
