using System.Threading.Tasks;

namespace api.Services
{
    public interface IDistanceService
    {
        Task<int[][]> GetDistanceMatrixAsync(string[] places);
    }
}