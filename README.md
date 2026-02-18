# PathPlanner: Efficient Trip Planning Application

PathPlanner assists users in efficiently planning their travel route by sequencing their desired destinations. Leveraging the modified Traveling Salesman Problem (TSP) algorithm, it lets users add the time plan. The app uses Google Maps APIs for map rendering, geocoding/autocomplete, directions, and time-aware matrix optimization.

## Tech stack

- React/TypeScript
- C#/.NET
- Docker
- Kubernetes/GKE
- Python
- Terraform
- Github Actions

## Architecture
TBD


## Variables

### Frontend Build Environment Variables

| Variable Name                       | Description                                                                                                                                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`                      | URL of the backend API (default: `/api`).                                                                                                                                                             |
| `VITE_TILE_URL`                     | Optional override for the backend tile endpoint (default: `${VITE_API_URL}/tiles/{z}/{x}/{y}.png`).                                                                                                 |

### Backend Runtime Environment Variables

| Variable Name                 | Description                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `CorsSettings:AllowedOrigins` | Origins for CORS settings in the backend. No cors needed for the deployment. |
| `GoogleMaps:ServiceAccountScopes:0` | OAuth scope item. Default is `https://www.googleapis.com/auth/cloud-platform`. |
| `GoogleMaps:TilesApiUrl` | Tiles base URL (default: `https://tile.googleapis.com/v1`). |
| `GoogleMaps:PlacesApiUrl` | Places base URL (default: `https://places.googleapis.com/v1`). |
| `GoogleMaps:RoutesApiUrl` | Routes base URL (default: `https://routes.googleapis.com`). |
| `OTEL_SERVICE_NAME` | OpenTelemetry service name for backend traces (default: `transport-optimizer-backend`). |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint for backend trace export (for example `http://otel-collector:4318/v1/traces`). |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | OTLP protocol for backend exporter. Use `http/protobuf` for HTTP endpoint mode. |

### Worker Runtime Environment Variables

| Variable Name | Description |
| ------------- | ----------- |
| `REDIS_URL` | Redis endpoint or URL used by worker. |
| `CELERY_QUEUE` | Celery queue key (default: `route`). |
| `OTEL_SERVICE_NAME` | OpenTelemetry service name for worker traces (default: `transport-optimizer-worker`). |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP endpoint for worker trace export (for example `http://otel-collector:4318/v1/traces`). |

### Local Trace Server (Collector + Jaeger)

Start local dependencies:

```bash
docker compose -f .devcontainer/docker-compose.yml up -d redis jaeger otel-collector
```

Use these env vars for local backend and worker:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

If backend/worker run inside Kubernetes, use:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318/v1/traces
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

Jaeger UI:

```bash
http://localhost:16686
```

## Deploy application

## Google Service Account Setup

1. In Google Cloud Console, open your project and enable: Places API (New), Routes API, and Map Tiles API.
2. Create a service account:
`IAM & Admin -> Service Accounts -> Create Service Account`.
3. Grant required roles to that service account:
`roles/serviceusage.serviceUsageConsumer` (or another role that includes `serviceusage.services.use`).
4. Create and download a JSON key for the service account.
5. Store the key securely in the repo secrets folder (for example `.secrets/gcp-sa.json`).
6. Configure backend env vars:
`GOOGLE_APPLICATION_CREDENTIALS=.secrets/gcp-sa.json`
7. Restart backend and verify `/api/tiles/{z}/{x}/{y}.png` and route/geocode flows.


### Deploy locally with dev container

1. Install prerequisites on your host:
   - Docker
   - VS Code + Dev Containers extension
2. Set host environment variables before opening the container:

```bash
export GOOGLE_APPLICATION_CREDENTIALS_JSON_B64="$(base64 -w0 /absolute/path/to/gcp-sa.json)"
```

3. Open the repo in Dev Container:
   - VS Code Command Palette -> `Dev Containers: Reopen in Container`
   - This starts `redis`, `jaeger`, and `otel-collector` from `.devcontainer/docker-compose.yml` and installs project dependencies via `.devcontainer/post-create.sh`.
4. Start app processes in the dev container (3 terminals):

```bash
# Terminal 1: backend
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318/v1/traces dotnet run --project backend/api/api.csproj

# Terminal 2: worker
cd worker
REDIS_URL=redis:6379 OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318/v1/traces pipenv run python main.py

# Terminal 3: frontend
cd frontend
npm run dev
```

5. Access local services:
   - Frontend: `http://localhost:3000`
   - Backend Swagger: `http://localhost:5259/swagger`
   - Jaeger: `http://localhost:16686`
6. Quick health checks:

```bash
curl http://localhost:5259/healthz
curl http://localhost:8081/healthz
```


### Deploy to K8s cluster

TBD
