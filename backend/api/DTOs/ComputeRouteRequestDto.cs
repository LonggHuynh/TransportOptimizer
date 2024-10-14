namespace api.DTOs;

public class ComputeOrderRequestDto
{
    
    public string[] Places { get; init; }
    public List<RequirementDto> Requirements { get; init; }
}