using api.Externals.DTOs;

namespace api.Externals;

public interface IGoogleRoutesClient
{
    Task<IReadOnlyList<RoutesComputeRouteMatrixElement>> ComputeRouteMatrixAsync(
        RoutesComputeRouteMatrixRequest requestDto
    );

    Task<RoutesComputeRoutesResponse?> ComputeRoutesAsync(RoutesComputeRoutesRequest requestDto);
}
