
using GoogleApi.Entities.Maps.DistanceMatrix.Request;
using GoogleApi.Entities.Maps.DistanceMatrix.Response;
using GoogleApi;
using GoogleApi.Entities.Maps.Geocoding.Address.Request;
using GoogleApi.Entities.Maps.Geocoding;
using GoogleApi.Entities.Maps.Common;
using GoogleApi.Entities.Maps.Directions.Request;
using GoogleApi.Entities.Maps.Directions.Response;
using GoogleApi.Entities.Common;
using GoogleApi.Entities.Maps.AddressValidation.Response;
using GoogleApi.Entities.Maps.Geolocation.Request;
using GoogleApi.Entities.Maps.Geolocation.Response;
using System.Net;
using System.Text.Json;
using api.Externals.DTOs;
using api.Models;

namespace api.Externals
{

 
    public class GoogleMapsClient(HttpClient httpClient, IConfiguration configuration) : IGoogleMapsClient
    {
        private readonly string _apiKey = configuration.GetSection("GoogleMaps:ApiKey").Get<string>();
        private readonly HttpClient _httpClient = httpClient;

        public async Task<DistanceMatrixResponse> GetDistanceMatrixAsync(DistanceMatrixRequest request)
        {
            request.Key = _apiKey;
            return await GoogleMaps.DistanceMatrix.QueryAsync(request);
        }


        public async Task<GoogleGeocodeResponse> GetGeoCode(string address)
        {
            var encodedAddress = Uri.EscapeDataString(address);
            var requestUrl = $"/maps/api/geocode/json?address={encodedAddress}";
            var response = await _httpClient.GetAsync(requestUrl);
            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"Geocoding API request failed with status code {response.StatusCode}");
            }
            var res = await response.Content.ReadFromJsonAsync<GoogleGeocodeResponse>();
            return res;
        }

    }





}