using api.Externals;
using api.Externals.DTOs;
using api.Models;

namespace api.Services
{
    public class GeocodeService(IGooglePlacesClient googlePlacesClient) : IGeocodeService
    {
        private readonly IGooglePlacesClient _googlePlacesClient = googlePlacesClient;

        private const int MinSuggestionQueryLength = 3;
        private const int MaxSuggestionLimit = 10;
        private const double AutocompleteBiasRadiusMeters = 50_000;

        public async Task<GeoCode?> GetGeocode(string? address, string? placeId = null)
        {
            var normalizedPlaceId = placeId?.Trim();
            var normalizedAddress = address?.Trim();
            if (string.IsNullOrWhiteSpace(normalizedAddress) && string.IsNullOrWhiteSpace(normalizedPlaceId))
            {
                return null;
            }

            if (!string.IsNullOrWhiteSpace(normalizedPlaceId))
            {
                var place = await _googlePlacesClient.GetPlaceDetailsAsync(normalizedPlaceId);
                return ToGeoCode(place);
            }

            var searchResponse = await _googlePlacesClient.SearchTextAsync(new PlacesSearchTextRequest
            {
                TextQuery = normalizedAddress!,
                MaxResultCount = 1,
            });
            var firstPlace = searchResponse?.Places?.FirstOrDefault();
            return ToGeoCode(firstPlace);
        }

        public async Task<IReadOnlyList<GeocodeSuggestion>> GetSuggestions(
            string query,
            int limit,
            GeoCode? biasCenter = null
        )
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return [];
            }

            var trimmed = query.Trim();
            if (trimmed.Length < MinSuggestionQueryLength)
            {
                return [];
            }

            var clampedLimit = Math.Max(1, Math.Min(limit, MaxSuggestionLimit));
            var response = await _googlePlacesClient.AutocompleteAsync(new PlacesAutocompleteRequest
            {
                Input = trimmed,
                IncludeQueryPredictions = true,
                LocationBias = ToLocationBias(biasCenter),
            });

            var suggestions = new List<GeocodeSuggestion>();
            var dedupe = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var prediction in response?.Suggestions?.Select(x => x.PlacePrediction) ?? [])
            {
                if (prediction is null)
                {
                    continue;
                }

                var label = prediction.Text?.Text?.Trim();
                if (string.IsNullOrWhiteSpace(label))
                {
                    continue;
                }

                var placeId = prediction.PlaceId?.Trim();
                var dedupeKey = !string.IsNullOrWhiteSpace(placeId)
                    ? $"place:{placeId.ToLowerInvariant()}"
                    : $"label:{label}";
                if (!dedupe.Add(dedupeKey))
                {
                    continue;
                }

                suggestions.Add(new GeocodeSuggestion
                {
                    Label = label,
                    PlaceId = placeId,
                });

                if (suggestions.Count >= clampedLimit)
                {
                    break;
                }
            }

            return suggestions;
        }

        private static GeoCode? ToGeoCode(PlaceDetailsResponse? place)
        {
            var location = place?.Location;
            if (location is null)
            {
                return null;
            }

            return new GeoCode
            {
                Latitude = location.Latitude,
                Longitude = location.Longitude,
            };
        }

        private static PlacesLocationBias? ToLocationBias(GeoCode? biasCenter)
        {
            if (biasCenter?.Latitude is not double latitude || biasCenter.Longitude is not double longitude)
            {
                return null;
            }

            return new PlacesLocationBias
            {
                Circle = new PlacesLocationBiasCircle
                {
                    Center = new PlacesCenterPoint
                    {
                        Latitude = latitude,
                        Longitude = longitude,
                    },
                    Radius = AutocompleteBiasRadiusMeters,
                },
            };
        }
    }
}
