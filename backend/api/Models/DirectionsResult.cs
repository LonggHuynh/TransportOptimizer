namespace api.Models
{
    public class DirectionsResult
    {
        public List<GeoCode> Coordinates { get; set; } = [];
        public double? DistanceMeters { get; set; }
        public double? DurationSeconds { get; set; }
    }
}
