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
        var endpoint = request.RequestUri?.AbsolutePath ?? string.Empty;
        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException(
                BuildHttpFailureMessage((int)response.StatusCode, googleErrorMessage, endpoint),
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
            BuildStatusFailureMessage(normalizedStatus, googleErrorMessage, endpoint),
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

            return (status, errorMessage);
        }
        catch (JsonException)
        {
            return (null, null);
        }
    }

    private static string BuildHttpFailureMessage(int statusCode, string? googleErrorMessage, string endpoint)
    {
        if (!string.IsNullOrWhiteSpace(googleErrorMessage))
        {
            return googleErrorMessage;
        }

        if (IsDistanceMatrixEndpoint(endpoint))
        {
            return $"Google Distance Matrix request failed with HTTP {statusCode}.";
        }

        return $"Google Maps request failed with HTTP {statusCode}.";
    }

    private static string BuildStatusFailureMessage(
        string googleStatus,
        string? googleErrorMessage,
        string endpoint
    )
    {
        if (!string.IsNullOrWhiteSpace(googleErrorMessage))
        {
            return googleErrorMessage;
        }

        if (IsDistanceMatrixEndpoint(endpoint))
        {
            return googleStatus switch
            {
                "REQUEST_DENIED" => "Google Distance Matrix denied the request. Check API key and enabled services.",
                "OVER_QUERY_LIMIT" => "Google Distance Matrix quota limit exceeded.",
                "OVER_DAILY_LIMIT" => "Google Distance Matrix daily quota exceeded.",
                "INVALID_REQUEST" => "Google Distance Matrix received an invalid request. Check coordinates and location count limits.",
                "MAX_ELEMENTS_EXCEEDED" => "Google Distance Matrix element limit exceeded. Reduce stop count and try again.",
                "UNKNOWN_ERROR" => "Google Distance Matrix returned an unknown error.",
                _ => $"Google Distance Matrix failed with status: {googleStatus}.",
            };
        }

        return googleStatus.ToUpperInvariant() switch
        {
            "REQUEST_DENIED" => "Google Maps denied the request.",
            "OVER_QUERY_LIMIT" => "Google Maps quota limit exceeded.",
            "OVER_DAILY_LIMIT" => "Google Maps daily quota exceeded.",
            "INVALID_REQUEST" => "Google Maps received an invalid request.",
            "MAX_ELEMENTS_EXCEEDED" => "Google Maps element limit exceeded.",
            "UNKNOWN_ERROR" => "Google Maps returned an unknown error.",
            _ => $"Google Maps request failed with status: {googleStatus}.",
        };
    }

    private static HttpStatusCode MapGoogleStatusToHttpStatus(string status)
    {
        return status switch
        {
            "REQUEST_DENIED" => HttpStatusCode.Forbidden,
            "OVER_QUERY_LIMIT" => HttpStatusCode.TooManyRequests,
            "OVER_DAILY_LIMIT" => HttpStatusCode.TooManyRequests,
            "INVALID_REQUEST" => HttpStatusCode.BadRequest,
            "MAX_ELEMENTS_EXCEEDED" => HttpStatusCode.BadRequest,
            "UNKNOWN_ERROR" => HttpStatusCode.BadGateway,
            _ => HttpStatusCode.BadGateway,
        };
    }

    private static bool IsDistanceMatrixEndpoint(string endpoint)
    {
        return endpoint.Contains("/distancematrix/", StringComparison.OrdinalIgnoreCase);
    }
}
