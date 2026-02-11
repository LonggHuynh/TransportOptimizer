# TransportOptimizer: Efficient Trip Planning Application

## Description

TransportOptimizer assists users in efficiently planning their travel route by sequencing their desired destinations. Leveraging the modified Traveling Salesman Problem (TSP) algorithm, it lets users apply optional constraints, such as mandating the sequence of specific locations. The app uses Google Maps APIs for map rendering, geocoding/autocomplete, directions, and time-aware matrix optimization.

## Tech stack

- React/TypeScript
- C#/.NET 8
- Docker
- Kubernetes/EKS
- Terraform
- Github Actions

## Architecture

![Alt text](TransportEKSArchitecture.png "EKS Architecture")

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
| `GoogleMaps:QuotaProject` | Optional billing/quota project ID sent as `X-Goog-User-Project`. |
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
docker compose up -d redis jaeger otel-collector
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

## Running the application

### With locally .NET and Node.js (TBD)

### Deploy locally with Docker compose

Start local dependencies (Redis + observability stack):

```bash
docker compose up -d
```

To shutdown

```bash
docker compose down
```

### Deploy to K8s cluster

For direct cluster access, connect to GKE with:

```bash
gcloud container clusters get-credentials transport --region europe-north1 --project pathoptimizer-486102
```

Images are published to GHCR from GitHub Actions (`backend.yml`, `worker.yml`) using:

- `sha-<commit>` immutable tags
- `<branch>-latest` moving tags (`stage-latest`, `prod-latest`)

Release behavior:

1. Push to `stage` or `prod` with backend changes:
   - builds backend image
   - triggers Terraform targeted apply for `helm_release.app["stage"|"prod"]`
2. Push to `stage` or `prod` with worker changes:
   - builds worker image
   - triggers the same Terraform targeted Helm apply
3. For manual promotions/rollbacks, trigger `.github/workflows/terraform-app-release.yml` and provide explicit tags.

Required repository secret:

- `TF_API_TOKEN`: Terraform Cloud user/team token for workspace access.

Manual Helm deploy is still possible for local experiments:

```
kubectl apply -f infra/k8s/namespaces.yaml
helm upgrade --install transport-optimizer infra/app-chart --namespace transport-stage
# or use --namespace transport-prod
```

## Google Service Account Setup

1. In Google Cloud Console, open your project and enable: Places API (New), Routes API, and Map Tiles API.
2. Create a service account:
`IAM & Admin -> Service Accounts -> Create Service Account`.
3. Grant required roles to that service account:
`roles/serviceusage.serviceUsageConsumer` (or another role that includes `serviceusage.services.use`).
4. Create and download a JSON key for the service account.
5. Store the key securely on the backend host (for example `/secrets/google-maps-sa.json`).
6. Configure backend env vars:
`GOOGLE_APPLICATION_CREDENTIALS=/secrets/google-maps-sa.json`
and optionally set app config
`GoogleMaps:QuotaProject=<your-gcp-project-id>`.
7. Restart backend and verify `/api/tiles/{z}/{x}/{y}.png` and route/geocode flows.
