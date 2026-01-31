using AutoMapper;
using api.DTOs;
using api.Models;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Requirement, RequirementDto>();
        CreateMap<RequirementDto, Requirement>();
        CreateMap<ComputeOrderRequest, ComputeOrderRequestDto>();
        CreateMap<ComputeOrderRequestDto, ComputeOrderRequest>();

        CreateMap<RouteResult, RouteResultDto>();
        CreateMap<GeoCode, GeocodeDto>();
    }
}
