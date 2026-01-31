using api.DTOs;

namespace api.Models;

public class RouteJobRecord
{
    public string JobId { get; init; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public RouteResultDto? Result { get; set; }
    public string? Error { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
