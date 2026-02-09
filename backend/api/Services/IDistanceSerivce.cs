using System.Threading.Tasks;
using api.Models;

namespace api.Services
{
    public interface IDistanceService
    {
        Task<int[][]> GetDistanceMatrixAsync(Coordinate[] places, DateTimeOffset? startTimeUtc, string? travelMode);
    }
}
