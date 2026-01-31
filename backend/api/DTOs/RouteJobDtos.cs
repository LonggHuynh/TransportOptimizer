namespace api.DTOs;

public class ComputeOrderQueuedResponseDto
{
    public string JobId { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
}

public class RouteJobStatusDto
{
    public string JobId { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public RouteResultDto? Result { get; init; }
    public string? Error { get; init; }
}
