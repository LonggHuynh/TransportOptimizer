FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY backend.sln ./
COPY api/api.csproj api/
RUN dotnet restore api/api.csproj

COPY api/ api/
RUN dotnet publish api/api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

LABEL org.opencontainers.image.source="https://github.com/longghuynh/TransportOptimizer"

COPY --from=build /app/publish ./

ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "api.dll"]
