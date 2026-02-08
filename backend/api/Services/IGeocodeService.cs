using api.Models;

namespace api.Services
{
    public interface IGeocodeService
    {
        Task<GeoCode?> GetGeocode(string address);
        Task<IReadOnlyList<GeocodeSuggestion>> GetSuggestions(string query, int limit);
    }
}
