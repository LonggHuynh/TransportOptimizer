using api.Externals.DTOs;
using api.Models;
using GoogleApi;
using GoogleApi.Entities.Maps.Directions.Request;
using GoogleApi.Entities.Maps.Directions.Response;
using GoogleApi.Entities.Maps.DistanceMatrix.Request;
using GoogleApi.Entities.Maps.DistanceMatrix.Response;
using GoogleApi.Entities.Maps.Geocoding;
using GoogleApi.Entities.Maps.Geolocation.Request;
using GoogleApi.Entities.Maps.Geolocation.Response;
namespace api.Externals
{
    public interface IGoogleMapsClient
    {
        Task<DistanceMatrixResponse> GetDistanceMatrixAsync(DistanceMatrixRequest request);

        Task<GoogleGeocodeResponse> GetGeoCode(string address);
    }
}