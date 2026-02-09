namespace api.DTOs;

public sealed class ErrorResponseDto
{
    public string Error { get; init; } = "Internal server error.";
    public string Code { get; init; } = "internal_error";
    public int Status { get; init; } = StatusCodes.Status500InternalServerError;
    public string TraceId { get; init; } = string.Empty;
}
