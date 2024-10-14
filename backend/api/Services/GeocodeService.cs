using System.Linq;
using System.Threading.Tasks;
using api.Externals;
using api.Models;
using GoogleApi;
using GoogleApi.Entities.Common;
using GoogleApi.Entities.Common.Enums;
using GoogleApi.Entities.Maps.Common;
using GoogleApi.Entities.Maps.Common.Enums;
using GoogleApi.Entities.Maps.DistanceMatrix.Request;
using GoogleApi.Entities.Maps.Geocoding;

namespace api.Services
{
    public class GeocodeService(IGoogleMapsClient googleMapsClient) : IGeocodeService
    {
        private readonly IGoogleMapsClient _googleMapsClient = googleMapsClient;

        public async Task<GeoCode?> GetGeocode(string address)
        {
            var res = await _googleMapsClient.GetGeoCode(address);
            var googleGeocode = res.Results.FirstOrDefault();
            if (googleGeocode == null) {
                return null;
            }
            return new GeoCode
            {
                Latitude = googleGeocode.Geometry.Location.Lat,
                Longitude = googleGeocode.Geometry.Location.Lng,
            };
        }
    }

}
