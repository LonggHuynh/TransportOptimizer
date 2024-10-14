using api.Models;

namespace api.Services
{
    public interface IGeocodeService
    {
        Task<GeoCode> GetGeocode(string address);
    }
}