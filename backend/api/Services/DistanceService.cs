using System.Linq;
using System.Threading.Tasks;
using api.Externals;
using GoogleApi;
using GoogleApi.Entities.Common;
using GoogleApi.Entities.Common.Enums;
using GoogleApi.Entities.Maps.Common;
using GoogleApi.Entities.Maps.Common.Enums;
using GoogleApi.Entities.Maps.DistanceMatrix.Request;

namespace api.Services
{
    public class DistanceService(IGoogleMapsClient googleMapsClient) : IDistanceService
    {
        private readonly IGoogleMapsClient _googleMapsClient = googleMapsClient;
        
        public async Task<int[][]> GetDistanceMatrixAsync(string[] places)
        {
            var locations = places.Select(p => new LocationEx(new Address(p)));

            var request = new DistanceMatrixRequest
            {
                Origins = locations,
                Destinations = locations,
                TravelMode = TravelMode.TRANSIT,
            };


            var response = await _googleMapsClient.GetDistanceMatrixAsync(request);

            if (response.Status == Status.Ok && response.Rows != null)
            {
                var adjMatrix = response.Rows
                    .Select(row => row.Elements
                        .Select(elem => elem.Duration?.Value ?? 0)
                        .ToArray())
                    .ToArray();

                return adjMatrix;
            }

            throw new Exception("Failed to get distance matrix");
        }
    }
}
