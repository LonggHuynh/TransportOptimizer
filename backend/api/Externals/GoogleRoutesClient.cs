using System.Net.Http.Json;
using System.Text.Json;
using api.Externals.DTOs;

namespace api.Externals;

public class GoogleRoutesClient(HttpClient httpClient) : IGoogleRoutesClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient = httpClient;

    private const string ComputeRoutesFieldMask =
        "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration";
    private const string ComputeRouteMatrixFieldMask =
        "originIndex,destinationIndex,status,condition,duration,staticDuration";

    public async Task<IReadOnlyList<RoutesComputeRouteMatrixElement>> ComputeRouteMatrixAsync(
        RoutesComputeRouteMatrixRequest requestDto
    )
    {
        using var request = CreateRequest(
            "distanceMatrix/v2:computeRouteMatrix",
            ComputeRouteMatrixFieldMask,
            requestDto
        );

        using var response = await _httpClient.SendAsync(request);
        var payload = await response.Content.ReadAsStringAsync();
        if (string.IsNullOrWhiteSpace(payload))
        {
            return [];
        }

        try
        {
            var elements = JsonSerializer.Deserialize<List<RoutesComputeRouteMatrixElement>>(payload, JsonOptions);
            if (elements is { Count: > 0 })
            {
                return elements;
            }
        }
        catch (JsonException)
        {
            // Fallback to single object parsing.
        }

        try
        {
            var element = JsonSerializer.Deserialize<RoutesComputeRouteMatrixElement>(payload, JsonOptions);
            return element is null ? [] : [element];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public async Task<RoutesComputeRoutesResponse?> ComputeRoutesAsync(RoutesComputeRoutesRequest requestDto)
    {
        using var request = CreateRequest(
            "directions/v2:computeRoutes",
            ComputeRoutesFieldMask,
            requestDto
        );

        using var response = await _httpClient.SendAsync(request);
        return await response.Content.ReadFromJsonAsync<RoutesComputeRoutesResponse>(JsonOptions);
    }

    private static HttpRequestMessage CreateRequest(string path, string fieldMask, object requestDto)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, new Uri(path, UriKind.Relative))
        {
            Content = JsonContent.Create(requestDto),
        };
        request.Headers.TryAddWithoutValidation("X-Goog-FieldMask", fieldMask);
        return request;
    }
}
