using System.Net;
using System.Text;
using System.Text.Json;
using api.Configuration;

namespace api.Externals.Handlers;

public class GoogleMapsErrorHandler(AppOptions appOptions) : DelegatingHandler
{
    private readonly string _googleMapsApiKey = appOptions.GoogleMaps?.ApiKey?.Trim() ?? string.Empty;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        TryAppendLegacyApiKey(request);

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
                BuildHttpFailureMessage((int)response.StatusCode, googleErrorMessage),
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

            return (status, errorMessage);
        }
        catch (JsonException)
        {
            return (null, null);
        }
    }

    private static string BuildHttpFailureMessage(int statusCode, string? googleErrorMessage)
    {
        if (!string.IsNullOrWhiteSpace(googleErrorMessage))
        {
            return googleErrorMessage;
        }

        return $"Upstream map service request failed with HTTP {statusCode}.";
    }

    private static string BuildStatusFailureMessage(string googleStatus, string? googleErrorMessage)
    {
        if (!string.IsNullOrWhiteSpace(googleErrorMessage))
        {
            return googleErrorMessage;
        }

        return googleStatus switch
        {
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
            "REQUEST_DENIED" => HttpStatusCode.Forbidden,
            "OVER_QUERY_LIMIT" => HttpStatusCode.TooManyRequests,
            "OVER_DAILY_LIMIT" => HttpStatusCode.TooManyRequests,
            "INVALID_REQUEST" => HttpStatusCode.BadRequest,
            "MAX_ELEMENTS_EXCEEDED" => HttpStatusCode.BadRequest,
            "UNKNOWN_ERROR" => HttpStatusCode.BadGateway,
            _ => HttpStatusCode.BadGateway,
        };
    }

    private void TryAppendLegacyApiKey(HttpRequestMessage request)
    {
        if (string.IsNullOrWhiteSpace(_googleMapsApiKey) || request.RequestUri is null)
        {
            return;
        }

        var uriText = request.RequestUri.ToString();
        if (string.IsNullOrWhiteSpace(uriText)
            || uriText.Contains("key=", StringComparison.OrdinalIgnoreCase)
            || !IsLegacyMapsApiRequest(uriText))
        {
            return;
        }

        var separator = uriText.Contains('?', StringComparison.Ordinal) ? "&" : "?";
        request.RequestUri = new Uri(
            $"{uriText}{separator}key={Uri.EscapeDataString(_googleMapsApiKey)}",
            request.RequestUri.IsAbsoluteUri ? UriKind.Absolute : UriKind.Relative
        );
    }

    private static bool IsLegacyMapsApiRequest(string uriText)
    {
        return uriText.Contains("distancematrix/json", StringComparison.OrdinalIgnoreCase)
            || uriText.Contains("geocode/json", StringComparison.OrdinalIgnoreCase)
            || uriText.Contains("directions/json", StringComparison.OrdinalIgnoreCase);
    }
}
