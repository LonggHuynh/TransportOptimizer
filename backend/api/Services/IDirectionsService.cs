using api.Models;

namespace api.Services
{
    public interface IDirectionsService
    {
        Task<DirectionsResult?> GetDirectionsAsync(string from, string to);
    }
}
