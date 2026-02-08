using System.Net.Http.Json;
using System.Text.Json;
using api.Externals.DTOs;

namespace api.Externals
{
    public record MapboxTile(byte[] Data, string ContentType);

    public class MapboxClient(HttpClient httpClient) : IMapboxClient
    {
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        private readonly HttpClient _httpClient = httpClient;

        public async Task<MapboxGeocodeResponse?> ForwardGeocodeAsync(string address)
        {
            var encoded = Uri.EscapeDataString(address);
            var url = $"/geocoding/v5/mapbox.places/{encoded}.json?limit=1";
            return await _httpClient.GetFromJsonAsync<MapboxGeocodeResponse>(url, JsonOptions);
        }

        public async Task<MapboxGeocodeResponse?> ForwardGeocodeAutocompleteAsync(string query, int limit, string? types = null)
        {
            var encoded = Uri.EscapeDataString(query);
            var clampedLimit = Math.Max(1, Math.Min(limit, 10));
            var url = $"/geocoding/v5/mapbox.places/{encoded}.json?limit={clampedLimit}&autocomplete=true";
            if (!string.IsNullOrWhiteSpace(types))
            {
                url += $"&types={Uri.EscapeDataString(types)}";
            }

            return await _httpClient.GetFromJsonAsync<MapboxGeocodeResponse>(url, JsonOptions);
        }

        public async Task<MapboxMatrixResponse?> GetMatrixAsync(string profile, string coordinates)
        {
            var url = $"/directions-matrix/v1/mapbox/{profile}/{coordinates}?annotations=duration";
            return await _httpClient.GetFromJsonAsync<MapboxMatrixResponse>(url, JsonOptions);
        }

        public async Task<MapboxDirectionsResponse?> GetDirectionsAsync(string profile, string coordinates)
        {
            var url = $"/directions/v5/mapbox/{profile}/{coordinates}?geometries=geojson&overview=full";
            return await _httpClient.GetFromJsonAsync<MapboxDirectionsResponse>(url, JsonOptions);
        }

        public async Task<MapboxTile?> GetTileAsync(string styleId, int tileSize, int z, int x, int y)
        {
            var url = $"/styles/v1/{styleId}/tiles/{tileSize}/{z}/{x}/{y}";
            using var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var bytes = await response.Content.ReadAsByteArrayAsync();
            var contentType = response.Content.Headers.ContentType?.MediaType ?? "image/png";
            return new MapboxTile(bytes, contentType);
        }
    }
}
