using System.Net;
using api.Models;

namespace api.Services;

public interface ICoordinateValidator
{
    void EnsureValid(IReadOnlyList<Coordinate> coordinates);
}

public class CoordinateValidator : ICoordinateValidator
{
    public void EnsureValid(IReadOnlyList<Coordinate> coordinates)
    {
        for (var index = 0; index < coordinates.Count; index += 1)
        {
            var latitude = coordinates[index].Latitude;
            var longitude = coordinates[index].Longitude;
            if (double.IsNaN(latitude)
                || double.IsInfinity(latitude)
                || latitude < -90
                || latitude > 90
                || double.IsNaN(longitude)
                || double.IsInfinity(longitude)
                || longitude < -180
                || longitude > 180)
            {
                throw new HttpRequestException(
                    $"Location {index + 1} has invalid coordinates.",
                    null,
                    HttpStatusCode.BadRequest
                );
            }
        }
    }
}
