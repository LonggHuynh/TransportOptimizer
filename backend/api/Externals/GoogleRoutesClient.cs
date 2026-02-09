using System.Globalization;
using System.Net;
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

    private const string RoutesComputeRoutesFieldMask =
        "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration";
    private const string RoutesComputeRouteMatrixFieldMask =
        "originIndex,destinationIndex,status,condition,duration,staticDuration";

    public async Task<GoogleDistanceMatrixResponse?> GetDistanceMatrixAsync(
        string origins,
        string destinations,
        string travelMode,
        DateTimeOffset? departureTimeUtc
    )
    {
        if (string.IsNullOrWhiteSpace(origins) || string.IsNullOrWhiteSpace(destinations))
        {
            return null;
        }

        var originPoints = ParseCoordinateList(origins);
        var destinationPoints = ParseCoordinateList(destinations);
        var normalizedTravelMode = ToRoutesTravelMode(travelMode);

        using var request = CreateRoutesRequest(
            "distanceMatrix/v2:computeRouteMatrix",
            RoutesComputeRouteMatrixFieldMask,
            new RoutesComputeRouteMatrixRequest
            {
                Origins = originPoints.Select(ToMatrixOrigin).ToList(),
                Destinations = destinationPoints.Select(ToMatrixDestination).ToList(),
                TravelMode = normalizedTravelMode,
                RoutingPreference = null,
                DepartureTime = null,
            }
        );

        using var httpResponse = await _httpClient.SendAsync(request);
        var payload = await httpResponse.Content.ReadAsStringAsync();

        var rows = BuildDistanceMatrixRows(payload, originPoints.Count, destinationPoints.Count);
        return new GoogleDistanceMatrixResponse
        {
            Status = "OK",
            Rows = rows,
        };
    }

    public async Task<GoogleDirectionsResponse?> GetDirectionsAsync(
        string origin,
        string destination,
        string travelMode
    )
    {
        var originPoint = ParseCoordinate(origin);
        var destinationPoint = ParseCoordinate(destination);
        var normalizedTravelMode = ToRoutesTravelMode(travelMode);

        using var request = CreateRoutesRequest(
            "directions/v2:computeRoutes",
            RoutesComputeRoutesFieldMask,
            new RoutesComputeRoutesRequest
            {
                Origin = ToRouteWaypoint(originPoint),
                Destination = ToRouteWaypoint(destinationPoint),
                TravelMode = normalizedTravelMode,
                RoutingPreference = normalizedTravelMode == "DRIVE"
                    ? "TRAFFIC_AWARE"
                    : null,
            }
        );

        using var httpResponse = await _httpClient.SendAsync(request);
        var payload = await httpResponse.Content.ReadFromJsonAsync<RoutesComputeRoutesResponse>(JsonOptions);
        var route = payload?.Routes?.FirstOrDefault();
        if (route?.Polyline?.EncodedPolyline is not string encodedPolyline || string.IsNullOrWhiteSpace(encodedPolyline))
        {
            return new GoogleDirectionsResponse
            {
                Status = "ZERO_RESULTS",
                Routes = [],
            };
        }

        var durationSeconds = ParseDurationSeconds(route.Duration) ?? 0;
        var distanceMeters = route.DistanceMeters ?? 0;

        return new GoogleDirectionsResponse
        {
            Status = "OK",
            Routes =
            [
                new GoogleDirectionsRoute
                {
                    OverviewPolyline = new GoogleOverviewPolyline
                    {
                        Points = encodedPolyline,
                    },
                    Legs =
                    [
                        new GoogleDirectionsLeg
                        {
                            Duration = new GoogleDurationValue { Value = durationSeconds },
                            Distance = new GoogleDirectionsDistance { Value = distanceMeters },
                        },
                    ],
                },
            ],
        };
    }

    private static HttpRequestMessage CreateRoutesRequest(
        string path,
        string fieldMask,
        object payload
    )
    {
        var request = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = JsonContent.Create(payload),
        };
        request.Headers.TryAddWithoutValidation("X-Goog-FieldMask", fieldMask);
        return request;
    }

    private static string ToRoutesTravelMode(string? travelMode)
    {
        return travelMode?.Trim().ToLowerInvariant() switch
        {
            "walking" => "WALK",
            "bicycling" => "BICYCLE",
            "cycling" => "BICYCLE",
            "transit" => "TRANSIT",
            _ => "DRIVE",
        };
    }

    private static (double Latitude, double Longitude) ParseCoordinate(string value)
    {
        var parts = value.Split(',', StringSplitOptions.TrimEntries);
        if (parts.Length != 2
            || !double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var latitude)
            || !double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var longitude))
        {
            throw new HttpRequestException(
                "Invalid coordinate format in route request.",
                null,
                HttpStatusCode.BadRequest
            );
        }

        return (latitude, longitude);
    }

    private static List<(double Latitude, double Longitude)> ParseCoordinateList(string value)
    {
        return [.. value.Split('|', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).Select(ParseCoordinate)];
    }

    private static RoutesWaypoint ToRouteWaypoint((double Latitude, double Longitude) point)
    {
        return new RoutesWaypoint
        {
            Location = new RoutesLocation
            {
                LatLng = new RoutesLatLng
                {
                    Latitude = point.Latitude,
                    Longitude = point.Longitude,
                },
            },
        };
    }

    private static RoutesMatrixOrigin ToMatrixOrigin((double Latitude, double Longitude) point)
    {
        return new RoutesMatrixOrigin
        {
            Waypoint = ToRouteWaypoint(point),
        };
    }

    private static RoutesMatrixDestination ToMatrixDestination((double Latitude, double Longitude) point)
    {
        return new RoutesMatrixDestination
        {
            Waypoint = ToRouteWaypoint(point),
        };
    }

    private static int? ParseDurationSeconds(string? duration)
    {
        if (string.IsNullOrWhiteSpace(duration))
        {
            return null;
        }

        var trimmed = duration.Trim();
        if (!trimmed.EndsWith('s'))
        {
            return null;
        }

        var numericPart = trimmed[..^1];
        if (!double.TryParse(numericPart, NumberStyles.Float, CultureInfo.InvariantCulture, out var seconds))
        {
            return null;
        }

        return (int)Math.Round(seconds, MidpointRounding.AwayFromZero);
    }

    private static GoogleDistanceMatrixElement CreateEmptyMatrixElement()
    {
        return new GoogleDistanceMatrixElement
        {
            Status = "ZERO_RESULTS",
            Duration = new GoogleDurationValue { Value = 0 },
            DurationInTraffic = new GoogleDurationValue { Value = 0 },
        };
    }

    private static List<GoogleDistanceMatrixRow> BuildDistanceMatrixRows(
        string payload,
        int originCount,
        int destinationCount
    )
    {
        var rows = Enumerable.Range(0, originCount)
            .Select(_ => new GoogleDistanceMatrixRow
            {
                Elements = Enumerable.Range(0, destinationCount)
                    .Select(_ => CreateEmptyMatrixElement())
                    .ToList(),
            })
            .ToList();

        foreach (var element in ParseRouteMatrixElements(payload))
        {
            if (element.OriginIndex is not int originIndex
                || element.DestinationIndex is not int destinationIndex
                || originIndex < 0
                || destinationIndex < 0
                || originIndex >= originCount
                || destinationIndex >= destinationCount)
            {
                continue;
            }

            var target = rows[originIndex].Elements![destinationIndex];
            var hasRoute = string.Equals(element.Condition, "ROUTE_EXISTS", StringComparison.OrdinalIgnoreCase);
            if (!hasRoute)
            {
                target.Status = "ZERO_RESULTS";
                target.Duration = new GoogleDurationValue { Value = 0 };
                target.DurationInTraffic = new GoogleDurationValue { Value = 0 };
                continue;
            }

            var trafficDurationSeconds = ParseDurationSeconds(element.Duration) ?? 0;
            var staticDurationSeconds = ParseDurationSeconds(element.StaticDuration) ?? trafficDurationSeconds;
            target.Status = "OK";
            target.Duration = new GoogleDurationValue
            {
                Value = staticDurationSeconds,
            };
            target.DurationInTraffic = new GoogleDurationValue
            {
                Value = trafficDurationSeconds,
            };
        }

        return rows;
    }

    private static List<RoutesComputeRouteMatrixElement> ParseRouteMatrixElements(string payload)
    {
        if (string.IsNullOrWhiteSpace(payload))
        {
            return [];
        }

        try
        {
            var parsedArray = JsonSerializer.Deserialize<List<RoutesComputeRouteMatrixElement>>(payload, JsonOptions);
            if (parsedArray is { Count: > 0 })
            {
                return parsedArray;
            }
        }
        catch (JsonException)
        {
            // Continue with single-element parsing fallback.
        }

        try
        {
            var singleElement = JsonSerializer.Deserialize<RoutesComputeRouteMatrixElement>(payload, JsonOptions);
            return singleElement is null ? [] : [singleElement];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
