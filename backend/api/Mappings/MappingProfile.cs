using AutoMapper;
using api.DTOs;
using api.Models;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<StopWindow, StopWindowDto>();
        CreateMap<StopWindowDto, StopWindow>();
        CreateMap<Coordinate, CoordinateDto>();
        CreateMap<CoordinateDto, Coordinate>();
        CreateMap<ComputeOrderRequest, ComputeOrderRequestDto>();
        CreateMap<ComputeOrderRequestDto, ComputeOrderRequest>();

        CreateMap<RouteResult, RouteResultDto>();
        CreateMap<GeoCode, GeocodeDto>();
        CreateMap<GeocodeSuggestion, GeocodeSuggestionDto>();
    }
}
