namespace api.DTOs
{
    public class DirectionsResponseDto
    {
        public double? DistanceMeters { get; set; }
        public double? DurationSeconds { get; set; }
        public List<GeocodeDto> Coordinates { get; set; } = new();
    }
}
