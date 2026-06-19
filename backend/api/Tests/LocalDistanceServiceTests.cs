using System;
using System.Net;
using System.Threading.Tasks;
using api.Configuration;
using api.Models;
using api.Services;
using NUnit.Framework;

namespace api.Tests;

[TestFixture]
public class LocalDistanceServiceTests
{
    private const double DrivingSpeedKmh = 40.0;
    private readonly ICoordinateValidator _coordinateValidator = new CoordinateValidator();
    private const double ToleranceSeconds = 1.0;

    private static AppOptions CreateOptions() => new()
    {
        LocalDistanceMatrix = new LocalDistanceMatrixOptions
        {
            DrivingSpeedKmh = DrivingSpeedKmh,
            WalkingSpeedKmh = 5.0,
            BicyclingSpeedKmh = 15.0,
            TransitSpeedKmh = 25.0,
        }
    };

    private static Coordinate Coordinate(double latitude, double longitude) => new()
    {
        Latitude = latitude,
        Longitude = longitude,
    };

    [Test]
    public async Task GetDistanceMatrixAsync_WhenEmpty_ReturnsEmpty()
    {
        var service = new LocalDistanceService(CreateOptions(), _coordinateValidator);

        var matrix = await service.GetDistanceMatrixAsync(Array.Empty<Coordinate>(), null, null);

        Assert.That(matrix, Is.Empty);
    }

    [Test]
    public async Task GetDistanceMatrixAsync_WhenSinglePlace_ReturnsZeroMatrix()
    {
        var service = new LocalDistanceService(CreateOptions(), _coordinateValidator);
        var places = new[] { Coordinate(10.0, 20.0) };

        var matrix = await service.GetDistanceMatrixAsync(places, null, null);

        Assert.That(matrix.Length, Is.EqualTo(1));
        Assert.That(matrix[0][0], Is.EqualTo(0));
    }

    [Test]
    public async Task GetDistanceMatrixAsync_WhenTwoPlaces_ReturnsSymmetricDurations()
    {
        var service = new LocalDistanceService(CreateOptions(), _coordinateValidator);
        var places = new[]
        {
            Coordinate(52.5200, 13.4050),
            Coordinate(48.8566, 2.3522),
        };

        var matrix = await service.GetDistanceMatrixAsync(places, null, null);

        Assert.That(matrix.Length, Is.EqualTo(2));
        Assert.That(matrix[0][0], Is.EqualTo(0));
        Assert.That(matrix[1][1], Is.EqualTo(0));
        Assert.That(matrix[0][1], Is.GreaterThan(0));
        Assert.That(matrix[1][0], Is.EqualTo(matrix[0][1]).Within(ToleranceSeconds));
    }

    [Test]
    public async Task GetDistanceMatrixAsync_WhenWalkingMode_ReturnsLargerDurationThanDriving()
    {
        var service = new LocalDistanceService(CreateOptions(), _coordinateValidator);
        var places = new[]
        {
            Coordinate(52.5200, 13.4050),
            Coordinate(48.8566, 2.3522),
        };

        var drivingMatrix = await service.GetDistanceMatrixAsync(places, null, null);
        var walkingMatrix = await service.GetDistanceMatrixAsync(places, null, "walking");

        Assert.That(walkingMatrix[0][1], Is.GreaterThan(drivingMatrix[0][1]));
    }

    [Test]
    public void GetDistanceMatrixAsync_WhenInvalidCoordinate_ThrowsBadRequest()
    {
        var service = new LocalDistanceService(CreateOptions(), _coordinateValidator);
        var places = new[] { Coordinate(200.0, 0.0) };

        var exception = Assert.ThrowsAsync<HttpRequestException>(
            async () => await service.GetDistanceMatrixAsync(places, null, null));

        Assert.That(exception?.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public void HaversineDistanceMeters_WhenSamePoint_ReturnsZero()
    {
        var distance = GeoCalculator.HaversineDistanceMeters(10.0, 20.0, 10.0, 20.0);

        Assert.That(distance, Is.EqualTo(0.0).Within(1e-6));
    }

    [Test]
    public void HaversineDistanceMeters_WhenKnownRoute_ReturnsExpectedDistance()
    {
        var distance = GeoCalculator.HaversineDistanceMeters(52.5200, 13.4050, 48.8566, 2.3522);

        Assert.That(distance, Is.EqualTo(877_617.0).Within(1_000.0));
    }
}
