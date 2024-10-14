namespace api.Externals.DTOs
{
    public class GoogleGeocodeResponse
    {
        public string Status { get; set; }
        public string ErrorMessage { get; set; }
        public GoogleGeocodeResult[] Results { get; set; }
    }

    public class GoogleGeocodeResult
    {
        public string FormattedAddress { get; set; }
        public GoogleGeometry Geometry { get; set; }
    }

    public class GoogleGeometry
    {
        public GoogleLocation Location { get; set; }
    }

    public class GoogleLocation
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
    }
}
