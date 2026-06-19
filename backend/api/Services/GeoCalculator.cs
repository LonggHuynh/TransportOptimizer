using System;

namespace api.Services;

public static class GeoCalculator
{
    private const double EarthRadiusMeters = 6_371_000.0;
    private const double DegreesToRadians = Math.PI / 180.0;

    public static double HaversineDistanceMeters(double originLatitude, double originLongitude, double destinationLatitude, double destinationLongitude)
    {
        var originLatitudeRadians = originLatitude * DegreesToRadians;
        var destinationLatitudeRadians = destinationLatitude * DegreesToRadians;
        var latitudeDelta = (destinationLatitude - originLatitude) * DegreesToRadians;
        var longitudeDelta = (destinationLongitude - originLongitude) * DegreesToRadians;

        var sineLatitude = Math.Sin(latitudeDelta / 2.0);
        var sineLongitude = Math.Sin(longitudeDelta / 2.0);

        var intermediate = (sineLatitude * sineLatitude)
            + (Math.Cos(originLatitudeRadians) * Math.Cos(destinationLatitudeRadians) * sineLongitude * sineLongitude);

        var angularDistance = 2.0 * Math.Atan2(Math.Sqrt(intermediate), Math.Sqrt(1.0 - intermediate));
        return EarthRadiusMeters * angularDistance;
    }
}
