using api.Configuration;
using api.Models;

namespace api.Services;

public class LocalDistanceService(AppOptions appOptions, ICoordinateValidator coordinateValidator) : IDistanceService
{
    private const int SecondsPerHour = 3600;
    private const int MetersPerKilometer = 1000;

    private readonly AppOptions _appOptions = appOptions;
    private readonly ICoordinateValidator _coordinateValidator = coordinateValidator;

    public Task<int[][]> GetDistanceMatrixAsync(Coordinate[] places, DateTimeOffset? startTimeUtc, string? travelMode)
    {
        _ = startTimeUtc;

        if (places.Length == 0)
        {
            return Task.FromResult(Array.Empty<int[]>());
        }

        _coordinateValidator.EnsureValid(places);

        var speedMetersPerSecond = ResolveSpeedMetersPerSecond(travelMode);
        var size = places.Length;
        var matrix = new int[size][];

        for (var originIndex = 0; originIndex < size; originIndex += 1)
        {
            matrix[originIndex] = new int[size];
            for (var destinationIndex = 0; destinationIndex < size; destinationIndex += 1)
            {
                if (originIndex == destinationIndex)
                {
                    matrix[originIndex][destinationIndex] = 0;
                    continue;
                }

                var origin = places[originIndex];
                var destination = places[destinationIndex];
                var distanceMeters = GeoCalculator.HaversineDistanceMeters(
                    origin.Latitude, origin.Longitude,
                    destination.Latitude, destination.Longitude);
                matrix[originIndex][destinationIndex] = ToDurationSeconds(distanceMeters, speedMetersPerSecond);
            }
        }

        return Task.FromResult(matrix);
    }

    private static int ToDurationSeconds(double distanceMeters, double speedMetersPerSecond)
    {
        if (speedMetersPerSecond <= 0)
        {
            return 0;
        }

        var seconds = distanceMeters / speedMetersPerSecond;
        return (int)Math.Round(seconds, MidpointRounding.AwayFromZero);
    }

    private double ResolveSpeedMetersPerSecond(string? travelMode)
    {
        var speedKilometersPerHour = ResolveSpeedKilometersPerHour(travelMode);
        var metersPerHour = speedKilometersPerHour * MetersPerKilometer;
        return metersPerHour / SecondsPerHour;
    }

    private double ResolveSpeedKilometersPerHour(string? travelMode)
    {
        var options = _appOptions.LocalDistanceMatrix;
        return travelMode?.Trim().ToLowerInvariant() switch
        {
            "walking" => options.WalkingSpeedKmh,
            "bicycling" => options.BicyclingSpeedKmh,
            "cycling" => options.BicyclingSpeedKmh,
            "transit" => options.TransitSpeedKmh,
            _ => options.DrivingSpeedKmh,
        };
    }
}
