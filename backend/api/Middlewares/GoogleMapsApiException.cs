namespace api.Middlewares;

public class GoogleMapsApiException : Exception
{
    public int StatusCode { get; }

    public GoogleMapsApiException(
        string message,
        int statusCode = StatusCodes.Status502BadGateway,
        Exception? innerException = null
    ) : base(message, innerException)
    {
        StatusCode = statusCode;
    }
}
