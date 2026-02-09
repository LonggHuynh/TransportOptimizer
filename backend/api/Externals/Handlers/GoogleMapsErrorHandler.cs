using System.Net;
using System.Text;
using System.Text.Json;

namespace api.Externals.Handlers;

public class GoogleMapsErrorHandler : DelegatingHandler
{
    private static readonly HashSet<string> IgnoredStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "OK",
        "ZERO_RESULTS",
        "NOT_FOUND",
    };

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        var response = await base.SendAsync(request, cancellationToken);
        var payload = response.Content is null
            ? null
            : await response.Content.ReadAsByteArrayAsync(cancellationToken);
        var body = payload is { Length: > 0 }
            ? Encoding.UTF8.GetString(payload)
            : null;

        if (payload is { Length: > 0 } && response.Content is not null)
        {
            var restoredContent = new ByteArrayContent(payload);
            foreach (var header in response.Content.Headers)
            {
                restoredContent.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }

            response.Content = restoredContent;
        }

        if (!response.IsSuccessStatusCode)
        {
            var message = TryExtractErrorMessage(body)
                ?? $"Google Maps request failed with status code {(int)response.StatusCode}.";
            throw new HttpRequestException(message, null, response.StatusCode);
        }

        var googleStatus = TryExtractGoogleStatus(body);
        if (string.IsNullOrWhiteSpace(googleStatus) || IgnoredStatuses.Contains(googleStatus))
        {
            return response;
        }

        var mappedStatusCode = googleStatus.ToUpperInvariant() switch
        {
            "REQUEST_DENIED" => HttpStatusCode.Forbidden,
            "OVER_QUERY_LIMIT" => HttpStatusCode.TooManyRequests,
            "OVER_DAILY_LIMIT" => HttpStatusCode.TooManyRequests,
            "INVALID_REQUEST" => HttpStatusCode.BadRequest,
            "UNKNOWN_ERROR" => HttpStatusCode.BadGateway,
            _ => HttpStatusCode.BadGateway,
        };
        var mappedMessage = TryExtractErrorMessage(body)
            ?? $"Google Maps request failed with status: {googleStatus}.";
        throw new HttpRequestException(mappedMessage, null, mappedStatusCode);
    }

    private static string? TryExtractGoogleStatus(string? body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return null;
        }

        try
        {
            using var jsonDoc = JsonDocument.Parse(body);
            var root = jsonDoc.RootElement;
            if (root.ValueKind == JsonValueKind.Object
                && root.TryGetProperty("status", out var statusElement)
                && statusElement.ValueKind == JsonValueKind.String)
            {
                return statusElement.GetString();
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    private static string? TryExtractErrorMessage(string? body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return null;
        }

        try
        {
            using var jsonDoc = JsonDocument.Parse(body);
            var root = jsonDoc.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            if (root.TryGetProperty("error_message", out var legacyErrorMessage)
                && legacyErrorMessage.ValueKind == JsonValueKind.String)
            {
                return legacyErrorMessage.GetString();
            }

            if (root.TryGetProperty("error", out var errorElement))
            {
                if (errorElement.ValueKind == JsonValueKind.String)
                {
                    return errorElement.GetString();
                }

                if (errorElement.ValueKind == JsonValueKind.Object
                    && errorElement.TryGetProperty("message", out var messageElement)
                    && messageElement.ValueKind == JsonValueKind.String)
                {
                    return messageElement.GetString();
                }
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }
}
