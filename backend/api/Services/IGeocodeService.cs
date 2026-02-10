using api.Models;

namespace api.Services
{
    public interface IGeocodeService
    {
        Task<GeoCode?> GetGeocode(string? address, string? placeId = null);
        Task<IReadOnlyList<GeocodeSuggestion>> GetSuggestions(string query, int limit, GeoCode? biasCenter = null);
    }
}
